import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";

import { OpportunitiesView, type OppCategory, type OppItem } from "./opportunities-view";

const DAY = 86_400_000;

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function daysUntilBirthday(birthday: string, today: Date): number | null {
  const [, m, d] = birthday.split("-").map(Number);
  if (!m || !d) return null;
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < todayMid.getTime()) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - todayMid.getTime()) / DAY);
}

type Cust = {
  id: string;
  full_name: string;
  phone: string | null;
  last_visit_at: string | null;
  birthday: string | null;
  created_at: string;
  is_lead: boolean;
};

// Gerçek veri kullanılır. (Demo blok yalnızca geçici önizleme içindi.)
const DEMO = false;
const it = (
  name: string, phone: string, meta: string, value: number | null,
  call = false
): OppItem => ({
  id: `${name}-${meta}`, name, phone, meta, value,
  waMsg: `Merhaba ${name}, size özel bir fırsatımız var, bekleriz! 💜`, call,
});
const DEMO_CATEGORIES: OppCategory[] = [
  {
    key: "inactive", title: "90+ Gündür Gelmeyenler", subtitle: "Kayıp müşteri riski — hemen ulaş",
    count: 14, footerHref: "/musteriler", footerLabel: "Müşterilere Git",
    items: [it("Beren Yurt", "05321112233", "112 gün", 4200), it("Can Mercan", "05322223344", "98 gün", 1800), it("Naz Şahin", "05323334455", "91 gün", 9600)],
  },
  {
    key: "ending", title: "Paketi Bitmek Üzere", subtitle: "Son 1-2 seans kalan müşteriler",
    count: 8, footerHref: "/paketler", footerLabel: "Paketleri Yönet",
    items: [it("Elif Yıldız", "05324445566", "Son 1 seans", 7000), it("Murat Demir", "05325556677", "Son 2 seans", 2000), it("Selin Kaya", "05326667788", "Son 2 seans", 2400)],
  },
  {
    key: "noshow", title: "Randevu Alıp Gelmeyenler", subtitle: "No-show listesi — takip et",
    count: 6, footerHref: "/randevular", footerLabel: "Yeni Randevu Al",
    items: [it("Fatma D.", "05327778899", "Dün 14:00", null, true), it("Kemal A.", "05328889900", "2 gün önce", null, true)],
  },
  {
    key: "teklif", title: "Teklif Alıp Satın Almayanlar", subtitle: "Yakın kapanış fırsatı",
    count: 9, footerHref: "/leadler", footerLabel: "İndirim Teklif Et",
    items: [it("Kerem Akın", "05329990011", "5 gün", 12000, true), it("Lale Yücel", "05330001122", "3 gün", 7500, true)],
  },
  {
    key: "ongorusme", title: "Ön Görüşme → Dönüşmeyenler", subtitle: "Görüşüldü ama satış olmadı",
    count: 11, footerHref: "/leadler", footerLabel: "Lead'lere Git",
    items: [it("Naz Şahin", "05331112233", "10 gün önce", null, true), it("Hande Koç", "05332223344", "7 gün önce", null, true)],
  },
  {
    key: "birthday", title: "Doğum Günü Yaklaşanlar", subtitle: "Önümüzdeki 30 gün içinde",
    count: 7, footerHref: "/musteriler", footerLabel: "Müşterilere Git",
    items: [it("Zeynep Arslan", "05333334455", "Bugün 🎉", null), it("Ahmet Çelik", "05334445566", "3 gün sonra", null), it("Selin Kaya", "05335556677", "6 gün sonra", null)],
  },
  {
    key: "periodic", title: "Tekrar İşlem Zamanı Gelenler", subtitle: "Periyodik bakım vakti geldi",
    count: 12, footerHref: "/randevular", footerLabel: "Randevu Oluştur",
    items: [it("Murat Demir", "05336667788", "Cilt Bakımı · 4 hafta", null), it("Elif Yıldız", "05337778899", "Kalıcı Makyaj · 6 hafta", null)],
  },
  {
    key: "debt", title: "Borcu Olan Müşteriler", subtitle: "Toplam alacak: ₺18.400",
    count: 5, footerHref: "/cari", footerLabel: "Tahsilat Paneli",
    items: [it("Ahmet Çelik", "05338889900", "Gecikmiş", 7000, true), it("Selin Kaya", "05339990011", "2 gün", 4500, true), it("Murat Demir", "05340001122", "Bu ay", 6900, true)],
  },
];

export default async function FirsatlarPage() {
  const supabase = await createClient();
  const now = new Date();

  const [custRes, payRes, pkgRes, noShowRes, apptIdsRes, interIdsRes] =
    await Promise.all([
      supabase.from("customers").select("id, full_name, phone, last_visit_at, birthday, created_at, is_lead"),
      supabase.from("payments").select("customer_id, amount"),
      supabase.from("packages").select("customer_id, service_name, remaining_sessions, price, paid_amount, purchased_at, customer:customers(full_name, phone)"),
      supabase.from("appointments").select("customer_id, starts_at, customer:customers(full_name, phone)").eq("status", "no_show").order("starts_at", { ascending: false }),
      supabase.from("appointments").select("customer_id").not("customer_id", "is", null),
      supabase.from("interactions").select("customer_id"),
    ]);

  const customers = (custRes.data ?? []) as Cust[];

  const ltv = new Map<string, number>();
  for (const p of (payRes.data ?? []) as { customer_id: string | null; amount: number | null }[]) {
    if (!p.customer_id) continue;
    ltv.set(p.customer_id, (ltv.get(p.customer_id) ?? 0) + (p.amount ?? 0));
  }

  const apptSet = new Set(((apptIdsRes.data ?? []) as { customer_id: string }[]).map((a) => a.customer_id));
  const interSet = new Set(((interIdsRes.data ?? []) as { customer_id: string }[]).map((i) => i.customer_id));

  const serviceByCustomer = new Map<string, string>();
  for (const p of (pkgRes.data ?? []) as { customer_id: string | null; service_name: string | null }[]) {
    if (p.customer_id && p.service_name && !serviceByCustomer.has(p.customer_id)) {
      serviceByCustomer.set(p.customer_id, p.service_name);
    }
  }

  const daysSince = (iso: string | null) =>
    iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / DAY) : null;

  const realCustomers = customers.filter((c) => !c.is_lead);

  // 1) 90+ gündür gelmeyenler
  const inactiveItems: OppItem[] = realCustomers
    .map((c) => ({ c, days: daysSince(c.last_visit_at) }))
    .filter((x): x is { c: Cust; days: number } => x.days !== null && x.days >= 90)
    .sort((a, b) => b.days - a.days)
    .map(({ c, days }) => ({
      id: c.id, customerId: c.id, name: c.full_name, phone: c.phone,
      meta: `${days} gün`, value: ltv.get(c.id) ?? null,
      waMsg: `Merhaba ${c.full_name}, sizi özledik! Size özel bir fırsatımız var, tekrar bekleriz. 💜`,
      call: false,
    }));

  // 2) Paketi bitmek üzere (son 1-2 seans)
  const endingItems: OppItem[] = ((pkgRes.data ?? []) as {
    customer_id: string | null; remaining_sessions: number | null; price: number | null;
    customer: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null;
  }[])
    .filter((p) => (p.remaining_sessions ?? 0) > 0 && (p.remaining_sessions ?? 0) <= 2)
    .sort((a, b) => (a.remaining_sessions ?? 0) - (b.remaining_sessions ?? 0))
    .map((p, i) => {
      const cust = pickOne(p.customer);
      return {
        id: p.customer_id ?? `ending-${i}`, customerId: p.customer_id,
        name: cust?.full_name ?? "—", phone: cust?.phone ?? null,
        meta: `Son ${p.remaining_sessions} seans`, value: p.price ?? null,
        waMsg: `Merhaba ${cust?.full_name ?? ""}, paketinizde son seanslarınız kaldı. Yenileme için size özel fırsatımız var!`,
        call: false,
      };
    });

  // 3) Randevu alıp gelmeyenler (no-show)
  const noShowItems: OppItem[] = ((noShowRes.data ?? []) as {
    customer_id: string | null; starts_at: string;
    customer: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null;
  }[])
    .map((a) => {
      const cust = pickOne(a.customer);
      const d = daysSince(a.starts_at) ?? 0;
      return {
        id: `${a.customer_id}-${a.starts_at}`, customerId: a.customer_id,
        name: cust?.full_name ?? "—", phone: cust?.phone ?? null,
        meta: d <= 0 ? "Bugün" : d === 1 ? "Dün" : `${d} gün önce`, value: null,
        waMsg: `Merhaba ${cust?.full_name ?? ""}, kaçırdığınız randevunuz için yeni bir tarih ayarlayalım mı?`,
        call: true,
      };
    });

  // 4) Ön görüşme → dönüşmeyenler (görüşülmüş lead, randevu yok)
  const ongorusmeItems: OppItem[] = customers
    .filter((c) => c.is_lead && interSet.has(c.id) && !apptSet.has(c.id))
    .map((c) => ({ c, days: daysSince(c.created_at) ?? 0 }))
    .sort((a, b) => b.days - a.days)
    .map(({ c, days }) => ({
      id: c.id, customerId: c.id, name: c.full_name, phone: c.phone,
      meta: `${days} gün önce`, value: null,
      waMsg: `Merhaba ${c.full_name}, görüşmemizin ardından size özel bir teklif hazırladık!`,
      call: true,
    }));

  // 5) Doğum günü yaklaşanlar (30 gün içinde)
  const birthdayItems: OppItem[] = realCustomers
    .map((c) => ({ c, d: c.birthday ? daysUntilBirthday(c.birthday, now) : null }))
    .filter((x): x is { c: Cust; d: number } => x.d !== null && x.d <= 30)
    .sort((a, b) => a.d - b.d)
    .map(({ c, d }) => ({
      id: c.id, customerId: c.id, name: c.full_name, phone: c.phone,
      meta: d === 0 ? "Bugün 🎉" : `${d} gün sonra`, value: null,
      waMsg: `İyi ki doğdunuz ${c.full_name}! 🎉 Size özel bir hediyemiz var, bekleriz.`,
      call: false,
    }));

  // 6) Tekrar işlem zamanı gelenler (28-89 gün önce gelmiş)
  const periodicItems: OppItem[] = realCustomers
    .map((c) => ({ c, days: daysSince(c.last_visit_at) }))
    .filter((x): x is { c: Cust; days: number } => x.days !== null && x.days >= 28 && x.days < 90)
    .sort((a, b) => b.days - a.days)
    .map(({ c, days }) => ({
      id: c.id, customerId: c.id, name: c.full_name, phone: c.phone,
      meta: `${serviceByCustomer.get(c.id) ?? "Bakım"} · ${Math.floor(days / 7)} hafta`, value: null,
      waMsg: `Merhaba ${c.full_name}, bakım zamanınız geldi! Randevunuzu birlikte oluşturalım mı?`,
      call: false,
    }));

  // 7) Borcu olan müşteriler
  const debtMap = new Map<string, { name: string; phone: string | null; debt: number; overdue: boolean }>();
  for (const p of (pkgRes.data ?? []) as {
    customer_id: string | null; price: number | null; paid_amount: number | null; purchased_at: string | null;
    customer: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null;
  }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (debt <= 0 || !p.customer_id) continue;
    const cust = pickOne(p.customer);
    const overdue = !!p.purchased_at && now.getTime() - new Date(p.purchased_at).getTime() > 30 * DAY;
    const ex = debtMap.get(p.customer_id);
    if (ex) { ex.debt += debt; ex.overdue = ex.overdue || overdue; }
    else debtMap.set(p.customer_id, { name: cust?.full_name ?? "—", phone: cust?.phone ?? null, debt, overdue });
  }
  const debtors = [...debtMap.entries()].sort((a, b) => b[1].debt - a[1].debt);
  const totalDebt = debtors.reduce((s, [, d]) => s + d.debt, 0);
  const debtItems: OppItem[] = debtors.map(([id, d]) => ({
    id, customerId: id, name: d.name, phone: d.phone,
    meta: d.overdue ? "Gecikmiş" : "", value: d.debt,
    waMsg: `Merhaba ${d.name}, ödemenizle ilgili bir hatırlatma yapmak istedik. Detaylar için bize ulaşabilirsiniz.`,
    call: true,
  }));

  const realCategories: OppCategory[] = [
    { key: "inactive", title: "90+ Gündür Gelmeyenler", subtitle: "Kayıp müşteri riski — hemen ulaş", count: inactiveItems.length, items: inactiveItems, footerHref: "/musteriler", footerLabel: "Müşterilere Git" },
    { key: "ending", title: "Paketi Bitmek Üzere", subtitle: "Son 1-2 seans kalan müşteriler", count: endingItems.length, items: endingItems, footerHref: "/paketler", footerLabel: "Paketleri Yönet" },
    { key: "noshow", title: "Randevu Alıp Gelmeyenler", subtitle: "No-show listesi — takip et", count: noShowItems.length, items: noShowItems, footerHref: "/randevular", footerLabel: "Yeni Randevu Al" },
    { key: "ongorusme", title: "Ön Görüşme → Dönüşmeyenler", subtitle: "Görüşüldü ama satış olmadı", count: ongorusmeItems.length, items: ongorusmeItems, footerHref: "/leadler", footerLabel: "Lead'lere Git" },
    { key: "birthday", title: "Doğum Günü Yaklaşanlar", subtitle: "Önümüzdeki 30 gün içinde", count: birthdayItems.length, items: birthdayItems, footerHref: "/musteriler", footerLabel: "Müşterilere Git" },
    { key: "periodic", title: "Tekrar İşlem Zamanı Gelenler", subtitle: "Periyodik bakım vakti geldi", count: periodicItems.length, items: periodicItems, footerHref: "/randevular", footerLabel: "Randevu Oluştur" },
    { key: "debt", title: "Borcu Olan Müşteriler", subtitle: totalDebt > 0 ? `Toplam alacak: ₺${totalDebt.toLocaleString("tr-TR")}` : "Açık ödemeler", count: debtItems.length, items: debtItems, footerHref: "/cari", footerLabel: "Tahsilat Paneli" },
  ];

  const categories = DEMO ? DEMO_CATEGORIES : realCategories;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir Fırsatları"
        description="Mevcut verilerinden otomatik hesaplanan, aksiyon alınabilir müşteri grupları."
      />
      <OpportunitiesView categories={categories} />
    </div>
  );
}
