import type { createClient } from "@/lib/supabase/server";
import { BUSINESS_TZ } from "@/lib/zaman";
import { fetchDebtors, summarizeBalances, type DebtSummary } from "@/lib/balances";
import { formatMoney } from "@/components/shared/money";

import { parseDateKey, toDateKey } from "../randevular/date-range";
import { addMonths, dayKeyOf } from "../takvim/zaman";
import { pct, type Period } from "./period";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const pickOne = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const sum = (rows: { amount: number | null }[]) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
const dateAt = (key: string) => parseDateKey(key) as Date;

const PAGE = 1000;
const MAX_PAGES = 30;

/** PostgREST tek yanıtı ~1000 satırla sınırlar; sayfa sayfa okuyup birleştirir. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<{ rows: T[]; error: boolean }> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) {
      console.error("raporlar:", error);
      return { rows, error: true };
    }
    const chunk = (data ?? []) as T[];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return { rows, error: false };
}

export type MonthPoint = { key: string; y: number; m: number; ciro: number; gider: number; hizmet: number; randevu: number; partial: boolean };
export type NamedValue = { name: string; value: number };
export type StaffRow = { id: string; name: string; count: number; revenue: number; rate: number; commission: number };
export type Risk = { text: string; tone: "danger" | "warning" };

export type ReportData = {
  failed: boolean;
  revenue: number;
  prevRevenue: number;
  revenueDelta: number | null;
  expense: number;
  net: number;
  margin: number | null;
  servicesSold: number;
  servicesDelta: number | null;
  avgServiceFee: number;
  avgCustomerValue: number;
  customersTotal: number;
  newCustomers: number;
  appointments: number;
  showRate: number | null;
  newRealCustomers: number;
  perStaff: number | null;
  topCustomers: NamedValue[];
  debt: DebtSummary;
  months: MonthPoint[];
  sourceRevenue: NamedValue[];
  serviceRevenue: NamedValue[];
  sourceCustomers: NamedValue[];
  funnel: NamedValue[];
  staff: StaffRow[];
  risks: Risk[];
  hasAnyData: boolean;
};

/** Raporlar sayfasının tüm verisi; her sorgu işletmeye ve döneme sınırlı. */
export async function loadReport(
  supabase: SupabaseServer,
  businessId: string,
  period: Period,
  now: Date
): Promise<ReportData> {
  const startAt = dateAt(period.startKey).toISOString();
  const endAt = dateAt(period.endKey).toISOString();
  const prevStartAt = dateAt(period.prevStartKey).toISOString();
  const prevEndAt = dateAt(period.prevEndKey).toISOString();

  // Grafik penceresi: dönemin son ayında biten 12 ay (gelecek aylar çizilmez).
  const curMonth = toDateKey(now).slice(0, 7);
  const lastMonth = period.lastKey.slice(0, 7) < curMonth ? period.lastKey.slice(0, 7) : curMonth;
  const monthKeys = Array.from({ length: 12 }, (_, i) => addMonths(`${lastMonth}-01`, i - 11).slice(0, 7));
  const chartStartAt = dateAt(`${monthKeys[0]}-01`).toISOString();
  const chartStartKey = `${monthKeys[0]}-01`;
  const chartEndKey = addMonths(`${lastMonth}-01`, 1);
  const chartEndAt = dateAt(chartEndKey).toISOString();

  const [
    payPeriod,
    payPrev,
    expPeriod,
    expPrev,
    apptPeriod,
    apptPrevCount,
    custPeriod,
    custTotal,
    leadTotal,
    payChart,
    expChart,
    apptChart,
    staffRes,
    debtors,
  ] = await Promise.all([
    fetchAll<{ amount: number | null; customer_id: string | null; customer: { source: string | null } | { source: string | null }[] | null }>(
      (from, to) =>
        supabase
          .from("payments")
          .select("amount, customer_id, customer:customers(source)")
          .eq("business_id", businessId)
          .gte("created_at", startAt)
          .lt("created_at", endAt)
          .order("id")
          .range(from, to)
    ),
    fetchAll<{ amount: number | null }>((from, to) =>
      supabase
        .from("payments")
        .select("amount")
        .eq("business_id", businessId)
        .gte("created_at", prevStartAt)
        .lt("created_at", prevEndAt)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ amount: number | null }>((from, to) =>
      supabase
        .from("expenses")
        .select("amount")
        .eq("business_id", businessId)
        .gte("spent_at", period.startKey)
        .lte("spent_at", period.lastKey)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ amount: number | null }>((from, to) =>
      supabase
        .from("expenses")
        .select("amount")
        .eq("business_id", businessId)
        .gte("spent_at", period.prevStartKey)
        .lt("spent_at", period.prevEndKey)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{
      status: string | null;
      price: number | null;
      staff_member_id: string | null;
      customer_id: string | null;
      service: { name: string } | { name: string }[] | null;
      customer: { full_name: string | null } | { full_name: string | null }[] | null;
    }>((from, to) =>
      supabase
        .from("appointments")
        .select("status, price, staff_member_id, customer_id, service:services(name), customer:customers(full_name)")
        .eq("business_id", businessId)
        .gte("starts_at", startAt)
        .lt("starts_at", endAt)
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "completed")
      .gte("starts_at", prevStartAt)
      .lt("starts_at", prevEndAt),
    fetchAll<{ source: string | null; is_lead: boolean | null }>((from, to) =>
      supabase
        .from("customers")
        .select("source, is_lead")
        .eq("business_id", businessId)
        .gte("created_at", startAt)
        .lt("created_at", endAt)
        .order("id")
        .range(from, to)
    ),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_lead", false),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_lead", true),
    fetchAll<{ amount: number | null; created_at: string }>((from, to) =>
      supabase
        .from("payments")
        .select("amount, created_at")
        .eq("business_id", businessId)
        .gte("created_at", chartStartAt)
        .lt("created_at", chartEndAt)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ amount: number | null; spent_at: string }>((from, to) =>
      supabase
        .from("expenses")
        .select("amount, spent_at")
        .eq("business_id", businessId)
        .gte("spent_at", chartStartKey)
        .lt("spent_at", chartEndKey)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ starts_at: string; status: string | null }>((from, to) =>
      supabase
        .from("appointments")
        .select("starts_at, status")
        .eq("business_id", businessId)
        .neq("status", "cancelled")
        .gte("starts_at", chartStartAt)
        .lt("starts_at", chartEndAt)
        .order("id")
        .range(from, to)
    ),
    supabase.from("staff").select("id, full_name, commission_rate").eq("business_id", businessId),
    fetchDebtors(supabase, businessId),
  ]);

  const failed = Boolean(
    payPeriod.error ||
      payPrev.error ||
      expPeriod.error ||
      expPrev.error ||
      apptPeriod.error ||
      apptPrevCount.error ||
      custPeriod.error ||
      custTotal.error ||
      leadTotal.error ||
      payChart.error ||
      expChart.error ||
      apptChart.error ||
      staffRes.error ||
      debtors.error
  );

  // --- Dönem özeti ---
  const revenue = sum(payPeriod.rows);
  const prevRevenue = sum(payPrev.rows);
  const expense = sum(expPeriod.rows);
  const net = revenue - expense;
  const margin = revenue > 0 ? Math.round((net / revenue) * 100) : null;

  const completed = apptPeriod.rows.filter((a) => a.status === "completed");
  const servicesSold = completed.length;
  const servicesDelta = pct(servicesSold, apptPrevCount.count ?? 0);
  const serviceIncome = completed.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const avgServiceFee = servicesSold > 0 ? serviceIncome / servicesSold : 0;
  const payers = new Set(payPeriod.rows.map((p) => p.customer_id).filter(Boolean)).size;
  const avgCustomerValue = payers > 0 ? revenue / payers : 0;

  // --- Kaynak ve hizmet dağılımları ---
  const topN = (m: Map<string, number>, n: number): NamedValue[] => {
    const sorted = [...m.entries()].map(([name, value]) => ({ name, value })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, n);
    const rest = sorted.slice(n).reduce((s, r) => s + r.value, 0);
    return rest > 0 ? [...top, { name: "Diğer", value: rest }] : top;
  };
  const srcRev = new Map<string, number>();
  for (const p of payPeriod.rows) {
    const name = pickOne(p.customer)?.source?.trim() || "Belirtilmemiş";
    srcRev.set(name, (srcRev.get(name) ?? 0) + (Number(p.amount) || 0));
  }
  const svcRev = new Map<string, number>();
  for (const a of completed) {
    const name = pickOne(a.service)?.name ?? "Diğer";
    svcRev.set(name, (svcRev.get(name) ?? 0) + (Number(a.price) || 0));
  }
  const srcCust = new Map<string, number>();
  for (const c of custPeriod.rows) {
    const name = c.source?.trim() || "Belirtilmemiş";
    srcCust.set(name, (srcCust.get(name) ?? 0) + 1);
  }

  // --- Müşteri yolu (dönem içinde) ---
  const newPeople = custPeriod.rows.length;
  const funnel: NamedValue[] = [
    { name: "Yeni kişi", value: newPeople },
    { name: "Müşteri olan", value: custPeriod.rows.filter((c) => !c.is_lead).length },
    { name: "Randevu", value: apptPeriod.rows.length },
    { name: "Tamamlanan randevu", value: servicesSold },
  ];

  // --- Personel ---
  const staffList = (staffRes.data ?? []) as { id: string; full_name: string; commission_rate: number | null }[];
  const agg = new Map<string, { count: number; revenue: number }>();
  for (const a of completed) {
    if (!a.staff_member_id) continue;
    const cur = agg.get(a.staff_member_id) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(a.price) || 0;
    agg.set(a.staff_member_id, cur);
  }
  const staff: StaffRow[] = staffList
    .map((s) => {
      const a = agg.get(s.id) ?? { count: 0, revenue: 0 };
      const rate = Number(s.commission_rate) || 0;
      return { id: s.id, name: s.full_name, count: a.count, revenue: a.revenue, rate, commission: (a.revenue * rate) / 100 };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // --- Aylık seri (12 ay, İstanbul ayları) ---
  const months: MonthPoint[] = monthKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    return { key, y, m, ciro: 0, gider: 0, hizmet: 0, randevu: 0, partial: key === curMonth };
  });
  const at = new Map(months.map((p, i) => [p.key, i]));
  for (const p of payChart.rows) {
    const i = at.get(dayKeyOf(p.created_at, BUSINESS_TZ).slice(0, 7));
    if (i !== undefined) months[i].ciro += Number(p.amount) || 0;
  }
  for (const e of expChart.rows) {
    const i = at.get(String(e.spent_at).slice(0, 7));
    if (i !== undefined) months[i].gider += Number(e.amount) || 0;
  }
  for (const a of apptChart.rows) {
    const i = at.get(dayKeyOf(a.starts_at, BUSINESS_TZ).slice(0, 7));
    if (i === undefined) continue;
    months[i].randevu += 1;
    if (a.status === "completed") months[i].hizmet += 1;
  }

  // --- Randevu özeti ---
  const active = apptPeriod.rows.filter((a) => a.status !== "cancelled");
  const cameCount = apptPeriod.rows.filter((a) => a.status === "completed" || a.status === "arrived").length;
  const noShowCount = apptPeriod.rows.filter((a) => a.status === "no_show").length;
  const showRate = cameCount + noShowCount > 0 ? Math.round((cameCount / (cameCount + noShowCount)) * 100) : null;
  const staffWithAppts = new Set(active.map((a) => a.staff_member_id).filter(Boolean)).size;
  const perStaff = staffWithAppts > 0 ? Math.round((active.filter((a) => a.staff_member_id).length / staffWithAppts) * 10) / 10 : null;
  const custCount = new Map<string, { name: string; value: number }>();
  for (const a of active) {
    if (!a.customer_id) continue;
    const cur = custCount.get(a.customer_id) ?? { name: pickOne(a.customer)?.full_name?.trim() || "Adsız müşteri", value: 0 };
    cur.value += 1;
    custCount.set(a.customer_id, cur);
  }
  const topCustomers = [...custCount.values()]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "tr"))
    .slice(0, 5);

  // --- Dikkat edilecekler ---
  const debt = summarizeBalances(debtors.rows);
  const revenueDelta = pct(revenue, prevRevenue);
  const lost = apptPeriod.rows.filter((a) => a.status === "no_show" || a.status === "cancelled").length;
  const finished = completed.length + lost;
  const lostRate = finished >= 5 ? (lost / finished) * 100 : 0;
  const customersTotal = custTotal.count ?? 0;
  const leads = leadTotal.count ?? 0;
  const conversion = customersTotal + leads >= 5 ? (customersTotal / (customersTotal + leads)) * 100 : null;

  const money = formatMoney;
  const risks: Risk[] = [];
  if (net < 0) risks.push({ text: `Bu dönem ${money(Math.abs(net))} zarardasınız. Giderlerinizi gözden geçirin.`, tone: "danger" });
  if (debt.overdueCount > 0) {
    risks.push({
      text: `${debt.overdueCount} müşterinin ödemesi geciken ${money(debt.overdueAmount)} tutarında. Cari'den ödeme alabilirsiniz.`,
      tone: "danger",
    });
  }
  if (revenueDelta !== null && revenueDelta < 0) {
    risks.push({ text: `Ciro önceki döneme göre %${Math.abs(revenueDelta)} düştü.`, tone: "warning" });
  }
  if (lostRate > 20) {
    risks.push({ text: `Randevuların %${Math.round(lostRate)}'i iptal edildi ya da müşteri gelmedi.`, tone: "warning" });
  }
  if (conversion !== null && conversion < 30) {
    risks.push({ text: `Potansiyel müşterilerin yalnızca %${Math.round(conversion)}'i müşteriye dönüştü.`, tone: "warning" });
  }

  const hasAnyData =
    revenue > 0 || expense > 0 || apptPeriod.rows.length > 0 || newPeople > 0 || months.some((p) => p.ciro > 0 || p.gider > 0 || p.randevu > 0);

  return {
    failed,
    revenue,
    prevRevenue,
    revenueDelta,
    expense,
    net,
    margin,
    servicesSold,
    servicesDelta,
    avgServiceFee,
    avgCustomerValue,
    customersTotal,
    newCustomers: newPeople,
    appointments: active.length,
    showRate,
    newRealCustomers: custPeriod.rows.filter((c) => !c.is_lead).length,
    perStaff,
    topCustomers,
    debt,
    months,
    sourceRevenue: topN(srcRev, 5),
    serviceRevenue: topN(svcRev, 7),
    sourceCustomers: topN(srcCust, 5),
    funnel,
    staff,
    risks,
    hasAnyData,
  };
}
