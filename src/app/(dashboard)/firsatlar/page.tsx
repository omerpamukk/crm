import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { getBusinessId } from "@/lib/supabase/business";
import { fetchDebtors } from "@/lib/balances";
import { SEGMENTS, type Rhythm } from "@/lib/customer-rhythm";
import { fetchRhythm, isWinnable } from "@/lib/rhythm-query";
import { requireCapability } from "@/lib/supabase/guard";
import { DAY, daysUntilBirthday } from "../panel/dates";
import type { PackageOption, ServiceOption, StaffOption } from "../musteriler/customer-types";

import { OpportunitiesView, type OppCategory, type OppItem } from "./opportunities-view";

export const metadata = { title: "Gelir Fırsatları" };

/** Her grupta gösterilecek en çok kişi (sayı ise her zaman gerçek toplamdır). */
const LIST_LIMIT = 200;

type One<T> = T | T[] | null;
const pickOne = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type Cust = { id: string; full_name: string; phone: string | null };
type PkgRow = {
  id: string;
  customer_id: string | null;
  service_name: string | null;
  remaining_sessions: number | null;
  price: number | null;
  paid_amount: number | null;
  purchased_at: string | null;
  customer: One<{ full_name: string; phone: string | null }>;
};
type ApptRow = {
  customer_id: string | null;
  starts_at: string;
  customer: One<{ full_name: string; phone: string | null }>;
};

export default async function FirsatlarPage() {
  const { role } = await requireCapability("musteri_yonet");
  const abilities = { book: can(role, "randevu_yonet"), pay: can(role, "tahsilat") };
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  const debtors = abilities.pay && businessId ? await fetchDebtors(supabase, businessId) : { rows: [], error: false };
  const now = new Date();

  const [rhythm, pkgRes, birthdayRes, noShowRes, leadRes, servicesRes, staffRes] =
    await Promise.all([
      businessId ? fetchRhythm(supabase, businessId, now) : Promise.resolve({ map: new Map<string, Rhythm>(), error: true }),
      supabase
        .from("packages")
        .select("id, customer_id, service_name, remaining_sessions, price, paid_amount, purchased_at, customer:customers(full_name, phone)"),
      supabase
        .from("customers")
        .select("id, full_name, phone, birthday")
        .eq("is_lead", false)
        .not("birthday", "is", null),
      supabase
        .from("appointments")
        .select("customer_id, starts_at, customer:customers(full_name, phone)")
        .eq("status", "no_show")
        .order("starts_at", { ascending: false })
        .limit(LIST_LIMIT),
      supabase
        .from("customers")
        .select("id, full_name, phone, created_at")
        .eq("is_lead", true)
        .order("created_at", { ascending: true })
        .limit(LIST_LIMIT),
      abilities.book ? supabase.from("services").select("id, name, price").order("name") : null,
      abilities.book
        ? supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name")
        : null,
    ]);

  // Geri kazanılabilir: kendi düzenine göre gecikmiş müşteriler (0035, src/lib/customer-rhythm.ts).
  // En taze gecikme önce: geri dönme ihtimali en yüksek olanlar.
  const winnable = [...rhythm.map.entries()]
    .filter(([, r]) => isWinnable(r))
    .sort(([, a], [, b]) => a.overdueDays - b.overdueDays);
  const winnableIds = winnable.slice(0, LIST_LIMIT).map(([id]) => id);
  const winnableCustRes = winnableIds.length
    ? await supabase.from("customers").select("id, full_name, phone").in("id", winnableIds)
    : { data: [], error: null };

  const loadFailed = Boolean(rhythm.error || winnableCustRes.error || pkgRes.error || birthdayRes.error);
  if (loadFailed) console.error("firsatlar:", winnableCustRes.error ?? pkgRes.error ?? birthdayRes.error);

  const daysSince = (iso: string | null) =>
    iso ? Math.max(Math.floor((now.getTime() - new Date(iso).getTime()) / DAY), 0) : 0;
  const pkgs = (pkgRes.data ?? []) as unknown as PkgRow[];

  // Aynı müşterinin en son hizmeti (bakım zamanı satırında gösterilir)
  const serviceByCustomer = new Map<string, string>();
  for (const p of pkgs) {
    if (p.customer_id && p.service_name && !serviceByCustomer.has(p.customer_id)) {
      serviceByCustomer.set(p.customer_id, p.service_name);
    }
  }

  // Randevusu ya da görüşmesi olan lead'leri ayıkla (yalnızca bu lead'ler için sorgula)
  const leads = (leadRes.data ?? []) as { id: string; full_name: string; phone: string | null; created_at: string }[];
  const leadIds = leads.map((l) => l.id);
  const [leadApptRes, leadInterRes] = leadIds.length
    ? await Promise.all([
        supabase.from("appointments").select("customer_id").in("customer_id", leadIds),
        supabase.from("interactions").select("customer_id").in("customer_id", leadIds),
      ])
    : [null, null];
  const apptSet = new Set(((leadApptRes?.data ?? []) as { customer_id: string }[]).map((a) => a.customer_id));
  const interSet = new Set(((leadInterRes?.data ?? []) as { customer_id: string }[]).map((i) => i.customer_id));

  // 1) Paketi bitmek üzere (Genel Bakış ile aynı ölçü: son 1-2 seans)
  const ending: OppItem[] = pkgs
    .filter((p) => (p.remaining_sessions ?? 0) > 0 && (p.remaining_sessions ?? 0) <= 2)
    .sort((a, b) => (a.remaining_sessions ?? 0) - (b.remaining_sessions ?? 0))
    .map((p) => {
      const c = pickOne(p.customer);
      return {
        key: `ending-${p.id}`,
        customerId: p.customer_id,
        name: c?.full_name ?? "Müşteri belirtilmedi",
        phone: c?.phone ?? null,
        subtitle: `${p.service_name ?? "Paket"} · son ${p.remaining_sessions} seans`,
        amount: null,
        message: `Merhaba ${c?.full_name ?? ""}, paketinizde son seanslarınız kaldı. Yenileme için size özel bir fırsatımız var.`,
      };
    });

  // 2) Geri kazanılabilir
  const custById = new Map(
    ((winnableCustRes.data ?? []) as { id: string; full_name: string; phone: string | null }[]).map((c) => [c.id, c])
  );
  const winback: OppItem[] = winnable.slice(0, LIST_LIMIT).flatMap(([id, r]) => {
    const c = custById.get(id);
    if (!c) return [];
    const service = serviceByCustomer.get(id);
    return [{
      key: `winback-${id}`,
      customerId: id,
      name: c.full_name,
      phone: c.phone,
      subtitle: `${SEGMENTS[r.segment].label} · ${r.overdueDays} gün gecikti${service ? ` · ${service}` : ""}`,
      amount: null,
      message: `Merhaba ${c.full_name}, sizi özledik. Size uygun bir randevu ayarlayalım mı?`,
    }];
  });

  // 3) Bu hafta doğum günü (7 gün içinde; Genel Bakış ile aynı ölçü)
  const birthday: OppItem[] = ((birthdayRes.data ?? []) as (Cust & { birthday: string })[])
    .map((c) => ({ c, left: daysUntilBirthday(c.birthday, now) }))
    .filter((x): x is { c: Cust & { birthday: string }; left: number } => x.left !== null && x.left <= 7)
    .sort((a, b) => a.left - b.left)
    .map(({ c, left }) => ({
      key: `birthday-${c.id}`,
      customerId: c.id,
      name: c.full_name,
      phone: c.phone,
      subtitle: left === 0 ? "Bugün doğum günü" : left === 1 ? "Yarın doğum günü" : `${left} gün sonra doğum günü`,
      amount: null,
      message: `İyi ki doğdunuz ${c.full_name}. Size özel bir hediyemiz var, bekleriz.`,
    }));

  // 4) Randevuya gelmeyenler
  const noShow: OppItem[] = ((noShowRes.data ?? []) as unknown as ApptRow[]).map((a, i) => {
    const c = pickOne(a.customer);
    const d = daysSince(a.starts_at);
    return {
      key: `noshow-${a.customer_id ?? i}-${a.starts_at}`,
      customerId: a.customer_id,
      name: c?.full_name ?? "Müşteri belirtilmedi",
      phone: c?.phone ?? null,
      subtitle: d === 0 ? "Bugün gelmedi" : d === 1 ? "Dün gelmedi" : `${d} gün önce gelmedi`,
      amount: null,
      message: `Merhaba ${c?.full_name ?? ""}, kaçırdığınız randevu için yeni bir tarih ayarlayalım mı?`,
    };
  });

  // 5) Görüşülüp randevu almayan lead'ler
  const noBooking: OppItem[] = leads
    .filter((l) => interSet.has(l.id) && !apptSet.has(l.id))
    .map((l) => ({
      key: `lead-${l.id}`,
      customerId: l.id,
      name: l.full_name,
      phone: l.phone,
      subtitle: `${daysSince(l.created_at)} gün önce eklendi`,
      amount: null,
      message: `Merhaba ${l.full_name}, görüşmemizin ardından size uygun bir randevu ayarlayalım mı?`,
    }));

  // 7) Açık borcu olanlar
  // Tek kaynak: customer_balances (0031; src/lib/balances.ts) — diğer ekranlarla aynı borç.
  const debt: OppItem[] = debtors.rows.map((d) => ({
    key: `debt-${d.customer_id}`,
    customerId: d.customer_id,
    name: d.full_name,
    phone: d.phone,
    subtitle: d.overdue_amount > 0 ? "Gecikmiş borç" : "Açık borç",
    amount: d.balance,
    message: `Merhaba ${d.full_name}, ödemenizle ilgili bir hatırlatma yapmak istedik. Ayrıntılar için bize ulaşabilirsiniz.`,
  }));

  const categories: OppCategory[] = [
    { key: "paket", title: "Paketi bitmek üzere", hint: "Yenileme teklifi sunun", count: ending.length, items: ending, link: abilities.pay ? { href: "/paketler", label: "Paketler" } : null },
    { key: "gerikazan", title: "Geri kazanılabilir", hint: "Kendi düzenine göre gecikti; geri dönme ihtimali yüksek", count: winnable.length, items: winback, link: { href: "/musteriler", label: "Müşteriler" } },
    { key: "dogumgunu", title: "Bu hafta doğum günü", hint: "Tebrik edin, hediye seans önerin", count: birthday.length, items: birthday, link: { href: "/musteriler", label: "Müşteriler" } },
    { key: "iptal", title: "Randevuya gelmeyenler", hint: "Yeni bir tarih önerin", count: noShow.length, items: noShow, link: { href: "/randevular", label: "Randevular" } },
    { key: "lead", title: "Randevu almayan lead'ler", hint: "Görüştünüz ama randevu oluşmadı", count: noBooking.length, items: noBooking, link: { href: "/leadler", label: "Lead'ler" } },
    { key: "borc", title: "Açık borcu olanlar", hint: "Nazik bir hatırlatma gönderin", count: debt.length, items: debt, link: abilities.pay ? { href: "/cari", label: "Cari Hesap" } : null },
  ];
  // Borç yalnızca tahsilat yetkisi olana gösterilir (Genel Bakış'taki gibi)
  const shown = categories.filter((c) => c.key !== "borc" || abilities.pay);

  const services = ((servicesRes?.data ?? []) as ServiceOption[]) ?? [];
  const staff = ((staffRes?.data ?? []) as StaffOption[]) ?? [];
  const packages: PackageOption[] = abilities.book
    ? pkgs
        .filter((p) => p.customer_id && (p.remaining_sessions ?? 0) > 0)
        .map((p) => ({
          id: p.id,
          customer_id: p.customer_id,
          service_name: p.service_name,
          remaining_sessions: p.remaining_sessions,
        }))
    : [];

  return (
    <OpportunitiesView
      categories={shown}
      canBook={abilities.book}
      services={services}
      staff={staff}
      packages={packages}
      loadFailed={loadFailed}
    />
  );
}
