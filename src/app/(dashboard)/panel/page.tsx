import Link from "next/link";
import { Cake, CircleCheck, Clock3, PackageX, TrendingUp, UserPlus } from "lucide-react";
import { type Rhythm } from "@/lib/customer-rhythm";
import { fetchRhythm, isWinnable } from "@/lib/rhythm-query";

import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { getBusinessId } from "@/lib/supabase/business";
import { fetchDebtors, isOverdue, summarizeBalances } from "@/lib/balances";
import { canChangeArrival } from "@/lib/appointment-status";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { Money, formatMoney } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status";

import {
  MONTH_SHORT,
  PERIODS,
  TZ,
  daysUntilBirthday,
  fmtShortDate,
  resolvePeriod,
  trMidnight,
  trParts,
  type PeriodKey,
} from "./dates";
import { PanelShell } from "./panel-shell";
import { RevenueChart } from "./revenue-chart";
import { SectionError } from "./section-error";
import { TodaySchedule } from "./today-schedule";
import type { ApptStatus, ScheduleAppt } from "./types";

export const metadata = { title: "Genel Bakış" };

type One<T> = T | T[] | null;
function pickOne<T>(value: One<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const STATUSES: ApptStatus[] = ["planned", "arrived", "completed", "cancelled", "no_show"];
const normStatus = (s: string | null): ApptStatus => (STATUSES.includes(s as ApptStatus) ? (s as ApptStatus) : "planned");
const NO_STAFF = "00000000-0000-0000-0000-000000000000";

type TodayRow = {
  id: string;
  starts_at: string;
  status: string | null;
  arrived_at: string | null;
  customer_id: string | null;
  staff_member_id: string | null;
  customer: One<{ full_name: string; tags: string[] | null }>;
  service: One<{ name: string; duration_min: number | null }>;
  staff_member: One<{ full_name: string; title: string | null }>;
  package: One<{ total_sessions: number | null; remaining_sessions: number | null }>;
};
type PkgRow = {
  id: string;
  service_name: string | null;
  customer_id: string | null;
  price: number | null;
  paid_amount: number | null;
  remaining_sessions: number | null;
  purchased_at: string | null;
  customer: One<{ full_name: string }>;
};
type Debtor = { id: string; name: string; debt: number; overdue: boolean };

const pct = (cur: number, prev: number): number | null => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
const sum = (rows: { amount: number | null }[]) => rows.reduce((s, r) => s + (r.amount ?? 0), 0);

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d: dParam } = await searchParams;
  const period = (PERIODS.find((p) => p.key === dParam)?.key ?? "ay") as PeriodKey;
  const periodMeta = PERIODS.find((p) => p.key === period)!;

  const ctx = await getAccountContext();
  const role = ctx.role;
  const canFinance = can(role, "tahsilat"); // ciro, borç, aylık gelir
  const canCustomers = can(role, "musteri_yonet"); // yeni müşteri, fırsatlar, son eklenenler
  const canCreate = can(role, "randevu_yonet");
  const allAppts = can(role, "tum_randevular");

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  // Uzman yalnızca kendi randevularını görür; personel kaydına bağlı değilse hiçbirini.
  let staffId: string | null = null;
  if (!allAppts) {
    const { data: prof } = await supabase.from("profiles").select("staff_id").eq("id", ctx.userId).maybeSingle();
    staffId = (prof as { staff_id: string | null } | null)?.staff_id ?? null;
  }

  const now = new Date();
  const { y, m, d } = trParts(now);
  const startOfToday = trMidnight(y, m, d);
  const endOfToday = trMidnight(y, m, d + 1);
  const sixMonthsAgo = trMidnight(y, m - 5, 1);
  const P = resolvePeriod(period, now);
  const payFrom = new Date(Math.min(sixMonthsAgo.getTime(), P.prevStart.getTime(), trMidnight(y, m, d - 13).getTime()));

  const apptCount = (from: Date, to: Date) => {
    let q = supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .or("status.is.null,status.neq.cancelled");
    if (!allAppts) q = q.eq("staff_member_id", staffId ?? NO_STAFF);
    return q;
  };
  let todayQ = supabase
    .from("appointments")
    .select(
      "id, starts_at, status, arrived_at, customer_id, staff_member_id, customer:customers(full_name, tags), service:services(name, duration_min), staff_member:staff(full_name, title), package:packages(total_sessions, remaining_sessions)"
    )
    .gte("starts_at", startOfToday.toISOString())
    .lt("starts_at", endOfToday.toISOString())
    .order("starts_at", { ascending: true });
  if (!allAppts) todayQ = todayQ.eq("staff_member_id", staffId ?? NO_STAFF);

  const none = Promise.resolve({ data: null, count: null, error: null });
  const customerCount = (from: Date, to: Date) =>
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false)
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString());

  const [
    todayRes, apptFullRes, apptNowRes, apptPrevRes,
    payRes, pkgRes, debtRes, newCustRes, newCustPrevRes, birthdayRes, inactiveRes, recentRes, formCustRes, servicesRes, staffRes,
  ] = await Promise.all([
    todayQ,
    apptCount(P.start, P.end),
    apptCount(P.start, P.upToNow),
    apptCount(P.prevStart, P.prevEnd),
    canFinance ? supabase.from("payments").select("amount, created_at").gte("created_at", payFrom.toISOString()) : none,
    canFinance || canCustomers
      ? supabase.from("packages").select("id, service_name, customer_id, price, paid_amount, remaining_sessions, purchased_at, customer:customers(full_name)")
      : none,
    (canFinance || canCustomers) && businessId ? fetchDebtors(supabase, businessId) : Promise.resolve({ rows: [], error: false }),
    canCustomers ? customerCount(P.start, P.upToNow) : none,
    canCustomers ? customerCount(P.prevStart, P.prevEnd) : none,
    canCustomers ? supabase.from("customers").select("id, birthday").eq("is_lead", false).not("birthday", "is", null) : none,
    canCustomers && businessId ? fetchRhythm(supabase, businessId, now) : Promise.resolve({ map: new Map<string, Rhythm>(), error: false }),
    canCustomers ? supabase.from("customers").select("id, full_name, created_at").eq("is_lead", false).order("created_at", { ascending: false }).limit(5) : none,
    canCreate || canFinance ? supabase.from("customers").select("id, full_name, is_lead").order("full_name") : none,
    canCreate ? supabase.from("services").select("id, name, price").order("name") : none,
    canCreate ? supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name") : none,
  ]);

  // ---- Borç: tek kaynak (customer_balances, 0031; src/lib/balances.ts) ----
  const pkgs = (pkgRes.data ?? []) as unknown as PkgRow[];
  const debtorMap = new Map<string, Debtor>(
    debtRes.rows.map((b) => [b.customer_id, { id: b.customer_id, name: b.full_name, debt: b.balance, overdue: isOverdue(b) }])
  );
  const debtors = [...debtorMap.values()].sort((a, b) => b.debt - a.debt);
  const debtSummary = summarizeBalances(debtRes.rows);
  const totalDebt = debtSummary.openDebt;
  const overdueCount = debtSummary.overdueCount;

  // ---- Bugünün programı ----
  const todayRows = (todayRes.data ?? []) as unknown as TodayRow[];
  const schedule: ScheduleAppt[] = todayRows.map((r) => {
    const cust = pickOne(r.customer);
    const svc = pickOne(r.service);
    const stf = pickOne(r.staff_member);
    const pk = pickOne(r.package);
    const start = new Date(r.starts_at);
    const debt = r.customer_id ? debtorMap.get(r.customer_id) : undefined;
    return {
      id: r.id,
      startsAt: r.starts_at,
      endsAt: new Date(start.getTime() + (svc?.duration_min ?? 45) * 60_000).toISOString(),
      status: normStatus(r.status),
      arrivedAt: r.arrived_at,
      customerId: r.customer_id,
      customerName: cust?.full_name ?? "Müşteri belirtilmedi",
      tags: cust?.tags ?? [],
      service: svc?.name ?? "Hizmet belirtilmedi",
      staffId: r.staff_member_id,
      staffName: stf?.full_name ?? "",
      staffTitle: stf?.title ?? "",
      pkgUsed: pk?.total_sessions != null ? Math.max(0, pk.total_sessions - (pk.remaining_sessions ?? 0)) : null,
      pkgTotal: pk?.total_sessions ?? null,
      debt: canFinance ? (debt?.debt ?? 0) : 0,
      debtOverdue: canFinance ? (debt?.overdue ?? false) : false,
      canArrive: canChangeArrival(role, staffId, r.staff_member_id),
    };
  });

  // ---- Göstergeler ----
  const allPay = (payRes.data ?? []) as { amount: number | null; created_at: string }[];
  const inRange = (from: Date, to: Date) => allPay.filter((p) => p.created_at >= from.toISOString() && p.created_at < to.toISOString());
  const revenue = sum(inRange(P.start, P.upToNow));
  const prevRevenue = sum(inRange(P.prevStart, P.prevEnd));
  const revenueDelta = pct(revenue, prevRevenue);

  const dayKey = (iso: string | Date) => {
    const t = trParts(new Date(iso));
    return `${t.y}-${t.m}-${t.d}`;
  };
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) dayBuckets.set(dayKey(trMidnight(y, m, d - 13 + i)), 0);
  for (const p of allPay) {
    const k = dayKey(p.created_at);
    if (dayBuckets.has(k)) dayBuckets.set(k, (dayBuckets.get(k) ?? 0) + (p.amount ?? 0));
  }
  const daily = [...dayBuckets.values()];
  // Gerçek veri yoksa çizgi çizilmez (düz çizgi yanıltır)
  const sparkline = daily.some((v) => v > 0) ? daily : undefined;

  const apptValue = apptFullRes.count ?? 0;
  const apptDelta = pct(apptNowRes.count ?? 0, apptPrevRes.count ?? 0);
  const newCust = newCustRes.count ?? 0;
  const newCustDelta = pct(newCust, newCustPrevRes.count ?? 0);

  // ---- Gelir fırsatları (firsatlar modülüyle aynı ölçüler) ----
  const endingCount = pkgs.filter((p) => (p.remaining_sessions ?? 0) > 0 && (p.remaining_sessions ?? 0) <= 2).length;
  const birthdayWeek = ((birthdayRes.data ?? []) as { id: string; birthday: string }[]).filter((c) => {
    const left = daysUntilBirthday(c.birthday, now);
    return left !== null && left <= 7;
  }).length;
  const inactive = [...inactiveRes.map.values()].filter(isWinnable).length;
  const oppTotal = endingCount + inactive + birthdayWeek;
  const opportunities = [
    { label: "Paketi bitmek üzere", hint: "Yenileme teklifi sunun", count: endingCount, icon: <PackageX aria-hidden className="size-5 text-label-2" /> },
    { label: "Geri kazanılabilir", hint: "Kendi düzenine göre gecikti", count: inactive, icon: <Clock3 aria-hidden className="size-5 text-label-2" /> },
    { label: "Bu hafta doğum günü", hint: "Tebrik edin, hediye seans önerin", count: birthdayWeek, icon: <Cake aria-hidden className="size-5 text-label-2" /> },
  ];

  // ---- Aylık gelir (son 6 ay) ----
  const buckets: { key: string; label: string; value: number; partial: boolean }[] = [];
  for (let i = 0; i < 6; i++) {
    const t = trParts(trMidnight(y, m - 5 + i, 1));
    buckets.push({ key: `${t.y}-${t.m}`, label: MONTH_SHORT[t.m], value: 0, partial: i === 5 });
  }
  const bIdx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of allPay) {
    const t = trParts(new Date(p.created_at));
    const i = bIdx.get(`${t.y}-${t.m}`);
    if (i !== undefined) buckets[i].value += p.amount ?? 0;
  }
  const monthTotal = buckets.reduce((s, b) => s + b.value, 0);

  const recent = (recentRes.data ?? []) as { id: string; full_name: string; created_at: string }[];

  const weekday = now.toLocaleDateString("tr-TR", { weekday: "long", timeZone: TZ });
  const dayMonth = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: TZ });
  const eyebrow = `${weekday}, ${dayMonth}`.toLocaleUpperCase("tr-TR");

  const form = {
    customers: (formCustRes.data ?? []) as { id: string; full_name: string; is_lead: boolean }[],
    services: (servicesRes.data ?? []) as { id: string; name: string; price: number | null }[],
    staff: (staffRes.data ?? []) as { id: string; full_name: string }[],
    packages: pkgs.map((p) => ({ id: p.id, customer_id: p.customer_id, service_name: p.service_name, remaining_sessions: p.remaining_sessions })),
  };

  return (
    <PanelShell eyebrow={eyebrow} canCreateAppointment={canCreate} canCollect={canFinance} canSearch={canCustomers} form={form}>
      <MetricStrip aria-label="Özet göstergeler">
        {canFinance && (
          <Metric
            label="Ciro"
            value={formatMoney(revenue)}
            href="/tahsilat"
            delta={revenueDelta}
            context={revenueDelta !== null ? periodMeta.comp : undefined}
            sparkline={sparkline}
            sparklineTitle="Son 14 gün"
          />
        )}
        <Metric
          label="Randevu"
          value={apptValue.toLocaleString("tr-TR")}
          href="/randevular"
          delta={apptDelta}
          context={apptDelta !== null ? periodMeta.comp : undefined}
        />
        {canCustomers && (
          <Metric
            label="Yeni müşteri"
            value={newCust.toLocaleString("tr-TR")}
            href="/musteriler"
            delta={newCustDelta}
            context={newCustDelta !== null ? periodMeta.comp : undefined}
          />
        )}
        {canFinance && (
          <Metric
            label="Açık borç"
            value={formatMoney(totalDebt)}
            href="/cari"
            tone={totalDebt > 0 ? "danger" : "default"}
            flag={overdueCount > 0 ? `${overdueCount} gecikmiş` : undefined}
            context={debtors.length > 0 ? `${debtors.length} müşteri` : "Açık borç yok"}
          />
        )}
      </MetricStrip>

      <div className="grid items-start gap-x-5 gap-y-8 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        {todayRes.error ? (
          <SectionError title="Bugünün programı yüklenemedi" />
        ) : (
          <TodaySchedule appointments={schedule} nowIso={now.toISOString()} canPay={canFinance} canCreate={canCreate} />
        )}

        {(canCustomers || canFinance) && (
          <div className="min-w-0 space-y-8">
            {canCustomers && (
              <ListGroup
                title="Gelir Fırsatları"
                detail={oppTotal > 0 ? `${oppTotal} fırsat` : undefined}
                action={<Link href="/firsatlar" className="focus-ring rounded text-subhead font-medium text-primary-text">Tümü</Link>}
              >
                {oppTotal === 0 ? (
                  <li>
                    <EmptyState variant="inline" icon={TrendingUp} title="Şu an açık fırsat yok" description="Paketi biten, uzun süredir gelmeyen ve doğum günü yaklaşan müşteriler burada görünür." className="py-8" />
                  </li>
                ) : (
                  opportunities.map((o) => (
                    <ListRow key={o.label} leading={o.icon} title={o.label} subtitle={o.hint} trailing={<span className="tabular-nums text-label-2">{o.count}</span>} href="/firsatlar" />
                  ))
                )}
              </ListGroup>
            )}
            {canFinance && (
              <ListGroup
                title="Açık borç"
                detail={debtors.length > 0 ? `${debtors.length} müşteri` : undefined}
                action={totalDebt > 0 ? <Money amount={totalDebt} tone="debt" className="text-[0.9375rem]" /> : undefined}
                inset={60}
                footer={
                  <>
                    <span className="min-w-0 truncate">
                      {debtors.length > 5 ? `${debtors.length - 5} müşteri daha · ${formatMoney(debtors.slice(5).reduce((s, x) => s + x.debt, 0))}` : ""}
                    </span>
                    <Link href="/cari" className="focus-ring shrink-0 rounded font-medium text-primary-text">
                      Cari Hesap
                    </Link>
                  </>
                }
              >
                {debtors.length === 0 ? (
                  <li>
                    <EmptyState variant="inline" icon={CircleCheck} title="Açık borç yok" description="Paket ödemeleri tamamlandığında liste boş kalır." className="py-8" />
                  </li>
                ) : (
                  debtors.slice(0, 5).map((x) => (
                    <ListRow
                      key={x.id}
                      leading={<Avatar name={x.name} size="sm" />}
                      title={x.name}
                      subtitle={x.overdue ? <StatusBadge variant="danger" className="text-[0.75rem]">Gecikmiş</StatusBadge> : undefined}
                      trailing={<Money amount={x.debt} tone="debt" />}
                      href={`/musteriler/${x.id}`}
                    />
                  ))
                )}
              </ListGroup>
            )}
          </div>
        )}
      </div>

      {(canFinance || canCustomers) && (
        <div className="grid items-start gap-x-5 gap-y-8 lg:grid-cols-2">
          {canFinance && (
            <section aria-labelledby="h-gelir" className="min-w-0">
              <div className="mx-1 mb-2 flex min-w-0 items-center gap-2.5">
                <h2 id="h-gelir" className="section-title shrink-0 whitespace-nowrap">Aylık gelir</h2>
                <span className="min-w-0 truncate text-subhead text-label-2w">Son 6 ay{monthTotal > 0 ? ` · toplam ${formatMoney(monthTotal)}` : ""}</span>
              </div>
              {payRes.error ? (
                <SectionError title="Aylık gelir yüklenemedi" />
              ) : monthTotal > 0 ? (
                <div className="surface overflow-clip">
                  <RevenueChart data={buckets.map(({ label, value, partial }) => ({ label, value, partial }))} />
                </div>
              ) : (
                <EmptyState icon={TrendingUp} title="Henüz tahsilat yok" description="Ödeme aldıkça son 6 ayın geliri burada görünür." />
              )}
            </section>
          )}
          {canCustomers && (
            <ListGroup
              title="Son eklenen müşteriler"
              action={<Link href="/musteriler" className="focus-ring rounded text-subhead font-medium text-primary-text">Müşteriler</Link>}
              inset={60}
            >
              {recent.length === 0 ? (
                <li>
                  <EmptyState
                    variant="inline"
                    icon={UserPlus}
                    title="Henüz müşteri yok"
                    description="Müşteriler sayfasından ilk müşterinizi ekleyin."
                    className="py-8"
                    action={<Link href="/musteriler" className="focus-ring rounded font-semibold text-primary-text">Müşteriler</Link>}
                  />
                </li>
              ) : (
                recent.map((c) => (
                  <ListRow
                    key={c.id}
                    leading={<Avatar name={c.full_name} size="sm" />}
                    title={c.full_name}
                    trailing={<span className="text-subhead text-label-2">{fmtShortDate(c.created_at)}</span>}
                    href={`/musteriler/${c.id}`}
                  />
                ))
              )}
            </ListGroup>
          )}
        </div>
      )}
    </PanelShell>
  );
}
