import Link from "next/link";
import {
  Users,
  CalendarDays,
  Clock,
  UserPlus,
  Banknote,
  Wallet,
  TrendingUp,
  TrendingDown,
  Sparkles,
  PackageX,
  Clock3,
  Cake,
  ArrowRight,
  Zap,
  ListChecks,
  CalendarPlus,
  CalendarCheck,
  CheckCircle2,
  MessageCircle,
  Lightbulb,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { formatTime, formatDate, formatPrice } from "@/lib/format";
import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

import { NewCustomerButton } from "../musteriler/new-customer-button";
import { RevenueAreaChart, Sparkline } from "../raporlar/charts";

const DAY = 86_400_000;
const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type TodayAppointment = {
  id: string; starts_at: string; status: string | null; customer_id: string | null;
  customer: { full_name: string } | null; service: { name: string } | null;
};
type RecentCustomer = { id: string; full_name: string; created_at: string };

const PERIODS = [
  { key: "bugun", label: "Bugün", comp: "düne göre" },
  { key: "hafta", label: "Bu Hafta", comp: "geçen haftaya göre" },
  { key: "ay", label: "Bu Ay", comp: "geçen aya göre" },
  { key: "yil", label: "Bu Yıl", comp: "geçen yıla göre" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
function daysUntilBirthday(birthday: string, today: Date): number | null {
  const [, m, d] = birthday.split("-").map(Number);
  if (!m || !d) return null;
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < todayMid.getTime()) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - todayMid.getTime()) / DAY);
}
function waLink(phone: string) {
  const d = phone.replace(/\D/g, "");
  const n = d.startsWith("90") ? d : d.startsWith("0") ? `90${d.slice(1)}` : `90${d}`;
  return `https://wa.me/${n}`;
}

function resolvePeriod(d: PeriodKey, now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
  if (d === "bugun") {
    const prevStart = new Date(startOfToday); prevStart.setDate(prevStart.getDate() - 1);
    return { start: startOfToday, end: endOfToday, prevStart, prevEnd: startOfToday };
  }
  if (d === "hafta") {
    const start = new Date(startOfToday); start.setDate(start.getDate() - 6);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    return { start, end: endOfToday, prevStart, prevEnd: start };
  }
  if (d === "yil") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: new Date(now.getFullYear() + 1, 0, 1), prevStart: new Date(now.getFullYear() - 1, 0, 1), prevEnd: start };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1), prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1), prevEnd: start };
}

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d: dParam } = await searchParams;
  const period = (PERIODS.find((p) => p.key === dParam)?.key ?? "ay") as PeriodKey;
  const periodMeta = PERIODS.find((p) => p.key === period)!;

  const { fullName, email } = await getAccountContext();
  const displayName = (fullName ?? email ?? "").split(" ")[0] || "👋";
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fourteenDaysAgo = new Date(startOfToday); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
  const { start: pStart, end: pEnd, prevStart, prevEnd } = resolvePeriod(period, now);

  const [
    customersCount, pendingCount, todayRes, packagesRes, birthdayRes, inactiveCount, recentRes,
    sixMonthPayRes, leadsCount, fourteenPayRes, completedTodayRes,
    periodPayRes, prevPayRes, periodApptRes, periodNewCustRes,
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", false),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "planned").gte("starts_at", now.toISOString()),
    supabase.from("appointments").select("id, starts_at, status, customer_id, customer:customers(full_name), service:services(name)").gte("starts_at", startOfToday.toISOString()).lt("starts_at", endOfToday.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("packages").select("customer_id, price, paid_amount, remaining_sessions, purchased_at, customer:customers(full_name, phone)"),
    supabase.from("customers").select("id, full_name, birthday").not("birthday", "is", null),
    supabase.from("customers").select("*", { count: "exact", head: true }).not("last_visit_at", "is", null).lte("last_visit_at", ninetyDaysAgo.toISOString()),
    supabase.from("customers").select("id, full_name, created_at").eq("is_lead", false).order("created_at", { ascending: false }).limit(5),
    supabase.from("payments").select("amount, created_at").gte("created_at", sixMonthsAgo.toISOString()),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", true),
    supabase.from("payments").select("amount, created_at").gte("created_at", fourteenDaysAgo.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "completed").gte("starts_at", startOfToday.toISOString()).lt("starts_at", endOfToday.toISOString()),
    supabase.from("payments").select("amount").gte("created_at", pStart.toISOString()).lt("created_at", pEnd.toISOString()),
    supabase.from("payments").select("amount").gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).gte("starts_at", pStart.toISOString()).lt("starts_at", pEnd.toISOString()),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", false).gte("created_at", pStart.toISOString()).lt("created_at", pEnd.toISOString()),
  ]);

  const todayAppointments = (todayRes.data ?? []) as unknown as TodayAppointment[];
  const recentCustomers = (recentRes.data ?? []) as RecentCustomer[];

  // Dönem performansı
  const periodRevenue = ((periodPayRes.data ?? []) as { amount: number | null }[]).reduce((s, p) => s + (p.amount ?? 0), 0);
  const prevRevenue = ((prevPayRes.data ?? []) as { amount: number | null }[]).reduce((s, p) => s + (p.amount ?? 0), 0);
  const periodPct = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : null;
  const periodAppts = periodApptRes.count ?? 0;
  const periodNewCust = periodNewCustRes.count ?? 0;

  // Son 14 gün → sparkline + bugün cirosu
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) { const d = new Date(fourteenDaysAgo); d.setDate(d.getDate() + i); dayBuckets.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, 0); }
  let todayRevenue = 0;
  for (const p of (fourteenPayRes.data ?? []) as { amount: number | null; created_at: string }[]) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + (p.amount ?? 0));
    if (d >= startOfToday) todayRevenue += p.amount ?? 0;
  }
  const sparkData = [...dayBuckets.values()].slice(7).map((value) => ({ value }));

  // Borç
  type Debtor = { id: string; name: string; phone: string | null; debt: number; overdue: boolean };
  const debtorMap = new Map<string, Debtor>();
  for (const p of (packagesRes.data ?? []) as { customer_id: string | null; price: number | null; paid_amount: number | null; purchased_at: string | null; customer: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (debt <= 0 || !p.customer_id) continue;
    const overdue = !!p.purchased_at && now.getTime() - new Date(p.purchased_at).getTime() > 30 * DAY;
    const c = pickOne(p.customer);
    const existing = debtorMap.get(p.customer_id);
    if (existing) { existing.debt += debt; existing.overdue = existing.overdue || overdue; }
    else debtorMap.set(p.customer_id, { id: p.customer_id, name: c?.full_name ?? "—", phone: c?.phone ?? null, debt, overdue });
  }
  const debtors = [...debtorMap.values()].sort((a, b) => b.debt - a.debt);
  const totalDebt = debtors.reduce((s, d) => s + d.debt, 0);
  const overdueDebtors = debtors.filter((d) => d.overdue);

  // Fırsatlar
  const endingCount = ((packagesRes.data ?? []) as { remaining_sessions: number | null }[]).filter((p) => (p.remaining_sessions ?? 0) > 0 && (p.remaining_sessions ?? 0) <= 2).length;
  const birthdayUpcoming = ((birthdayRes.data ?? []) as { id: string; full_name: string; birthday: string }[])
    .map((c) => ({ ...c, days: daysUntilBirthday(c.birthday, now) }))
    .filter((c): c is { id: string; full_name: string; birthday: string; days: number } => c.days !== null);
  const birthdayWeek = birthdayUpcoming.filter((c) => c.days <= 7);
  const birthdayToday = birthdayUpcoming.filter((c) => c.days === 0);
  const inactive90 = inactiveCount.count ?? 0;
  const oppTotal = endingCount + inactive90 + birthdayWeek.length;

  // Aylık gelir grafiği
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()], value: 0 }); }
  const bucketIdx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of (sixMonthPayRes.data ?? []) as { amount: number | null; created_at: string }[]) {
    const d = new Date(p.created_at); const idx = bucketIdx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) buckets[idx].value += p.amount ?? 0;
  }
  const revenueData = buckets.map(({ label, value }) => ({ label, value }));

  const customerTotal = customersCount.count ?? 0;
  const pendingAppt = pendingCount.count ?? 0;
  const leadTotal = leadsCount.count ?? 0;
  const completedToday = completedTodayRes.count ?? 0;
  const completionPct = todayAppointments.length > 0 ? Math.round((completedToday / todayAppointments.length) * 100) : 0;
  const monthRevenue = ((periodPayRes.data ?? []) as { amount: number | null }[]).reduce((s, p) => s + (p.amount ?? 0), 0);

  // Akıllı günün özeti
  const summaryParts: string[] = [];
  summaryParts.push(todayAppointments.length > 0 ? `Bugün **${todayAppointments.length} randevu**, ${completedToday} tamamlandı` : "Bugün planlı randevu yok");
  if (todayRevenue > 0) summaryParts.push(`**${formatPrice(todayRevenue)}** tahsilat`);
  if (overdueDebtors.length > 0) summaryParts.push(`${overdueDebtors.length} gecikmiş ödeme — en acil **${overdueDebtors[0].name}** (${formatPrice(overdueDebtors[0].debt)})`);
  if (birthdayToday.length > 0) summaryParts.push(`🎂 ${birthdayToday.length} doğum günü`);
  const summary = summaryParts.join(" · ") + ".";

  const kpis = [
    { label: "Bu Ay Ciro", value: formatPrice(monthRevenue), icon: Banknote, tone: "bg-positive/10 text-positive", bar: "border-l-positive", trend: periodPct !== null ? { up: periodPct >= 0, text: `${periodMeta.comp} %${Math.abs(periodPct)}` } : null, href: "/tahsilat", spark: sparkData },
    { label: "Bekleyen Randevu", value: pendingAppt.toLocaleString("tr-TR"), icon: CalendarDays, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", sub: `Bugün ${todayAppointments.length} randevu`, href: "/randevular" },
    { label: "Tahsil Edilecek", value: formatPrice(totalDebt), icon: Wallet, tone: "bg-danger/10 text-danger", bar: "border-l-danger", sub: `${debtors.length} müşteri · ${overdueDebtors.length} gecikmiş`, href: "/cari", accent: totalDebt > 0 ? "text-danger" : "" },
    { label: "Toplam Müşteri", value: customerTotal.toLocaleString("tr-TR"), icon: Users, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: `${leadTotal} aktif lead`, href: "/musteriler" },
  ];

  const priorities = [
    { label: "Bekleyen randevuları kontrol et", count: pendingAppt, href: "/randevular", tone: "warning" as const },
    { label: "Tahsilat bekleyen müşteriler", count: debtors.length, href: "/cari", tone: "danger" as const },
    { label: "Değerlendirilecek fırsatlar", count: oppTotal, href: "/firsatlar", tone: "info" as const },
    { label: "Takip edilecek lead'ler", count: leadTotal, href: "/leadler", tone: "secondary" as const },
  ].filter((p) => p.count > 0);

  const urgent: { id: string; title: string; detail: string; href: string; tone: "danger" | "positive" }[] = [];
  for (const d of overdueDebtors.slice(0, 3)) urgent.push({ id: `debt-${d.id}`, title: "Gecikmiş ödeme", detail: `${d.name} · ${formatPrice(d.debt)}`, href: `/musteriler/${d.id}`, tone: "danger" });
  for (const b of birthdayToday.slice(0, 3)) urgent.push({ id: `bd-${b.id}`, title: "Bugün doğum günü 🎂", detail: `${b.full_name} · tebrik et`, href: `/musteriler/${b.id}`, tone: "positive" });

  const opportunities = [
    { label: "Paketi bitmek üzere", count: endingCount, icon: PackageX, tone: "text-amber-600 bg-warning/12" },
    { label: "90+ gündür gelmeyen", count: inactive90, icon: Clock3, tone: "text-danger bg-danger/10" },
    { label: "Bu hafta doğum günü", count: birthdayWeek.length, icon: Cake, tone: "text-positive bg-positive/10" },
  ];

  const todayLabel = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const periodStats = [
    { label: "Dönem Ciro", value: formatPrice(periodRevenue), icon: Banknote, tone: "text-positive" },
    { label: "Dönem Randevu", value: String(periodAppts), icon: CalendarDays, tone: "text-primary" },
    { label: "Yeni Müşteri", value: `+${periodNewCust}`, icon: UserPlus, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Karşılama bandı + dönem seçici + akıllı özet + dönem performansı */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{todayLabel}</p>
            <h1 className="mt-0.5 text-2xl font-bold">Merhaba {displayName} 👋</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-card p-0.5">
              {PERIODS.map((p) => (
                <Link key={p.key} href={p.key === "ay" ? "/panel" : `/panel?d=${p.key}`} className={cn(buttonVariants({ variant: period === p.key ? "secondary" : "ghost", size: "sm" }))}>
                  {p.label}
                </Link>
              ))}
            </div>
            <NewCustomerButton />
            <Link href="/tahsilat" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><Banknote className="size-4" />Ödeme Al</Link>
          </div>
        </div>

        {/* Akıllı özet */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Lightbulb className="size-4" /></span>
          <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
        </div>

        {/* Dönem performansı */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {periodStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2.5 rounded-xl border bg-card/70 p-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted", s.tone)}><Icon className="size-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                  <p className={cn("truncate text-base font-bold tabular-nums", s.tone)}>{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className={cn("h-full border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg", kpi.bar)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <span className={cn("flex size-9 items-center justify-center rounded-lg", kpi.tone)}><Icon className="size-5" /></span>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold tracking-tight tabular-nums", kpi.accent)}>{kpi.value}</div>
                  {kpi.trend && (
                    <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", kpi.trend.up ? "text-positive" : "text-danger")}>
                      {kpi.trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{kpi.trend.text}
                    </p>
                  )}
                  {kpi.sub && <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>}
                  {kpi.spark && <div className="-mb-2 mt-2"><Sparkline data={kpi.spark} /></div>}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Bugünün programı + fırsatlar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" />Bugünün Programı</CardTitle>
            <div className="flex items-center gap-3">
              {todayAppointments.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative size-9 rounded-full" style={{ background: `conic-gradient(#16A34A ${completionPct * 3.6}deg, var(--muted) 0deg)` }}>
                    <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-card text-[10px] font-bold">{completionPct}%</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{completedToday}/{todayAppointments.length}</span>
                </div>
              )}
              <Link href="/takvim" className="text-sm text-primary hover:underline">Takvim →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarCheck className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Bugün için planlanmış randevu yok.</p>
                <Link href="/randevular" className={cn(buttonVariants({ size: "sm" }), "mt-1")}><CalendarPlus className="size-4" />Randevu ekle</Link>
              </div>
            ) : (
              <ul className="divide-y">
                {todayAppointments.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-center text-sm font-bold tabular-nums text-primary">{formatTime(a.starts_at)}</span>
                      <div className="min-w-0">
                        {a.customer_id ? (
                          <Link href={`/musteriler/${a.customer_id}`} className="block truncate text-sm font-medium leading-tight hover:text-primary hover:underline">{a.customer?.full_name ?? "—"}</Link>
                        ) : (<p className="truncate text-sm font-medium leading-tight">{a.customer?.full_name ?? "—"}</p>)}
                        <p className="truncate text-xs text-muted-foreground">{a.service?.name ?? "Hizmet belirtilmedi"}</p>
                      </div>
                    </div>
                    <Badge variant={appointmentStatusVariant(a.status)}>{appointmentStatusLabel(a.status)}</Badge>
                  </li>
                ))}
                {todayAppointments.length > 6 && (<li className="pt-2.5"><Link href="/randevular" className="text-sm text-primary hover:underline">+{todayAppointments.length - 6} randevu daha →</Link></li>)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-accent border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" />Para Kazandıracak Fırsatlar</CardTitle>
            <Link href="/firsatlar" className="text-xs text-primary hover:underline">Tümü →</Link>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {opportunities.map((o) => {
              const Icon = o.icon;
              return (
                <Link key={o.label} href="/firsatlar" className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                  <span className="flex items-center gap-2 text-sm"><span className={cn("flex size-8 items-center justify-center rounded-lg", o.tone)}><Icon className="size-4" /></span>{o.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{o.count} kişi</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Gelir trendi + tahsil edilecek */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4 text-primary" />Gelir Trendi</CardTitle>
            <CardDescription>Son 6 ayda tahsil edilen ödemeler.</CardDescription>
          </CardHeader>
          <CardContent><RevenueAreaChart data={revenueData} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Banknote className="size-4 text-positive" />Tahsil Edilecek</CardTitle>
            <span className="text-sm font-bold text-positive">{formatPrice(totalDebt)}</span>
          </CardHeader>
          <CardContent>
            {debtors.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Açık ödeme yok 🎉</p>
            ) : (
              <ul className="space-y-1">
                {debtors.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex items-center gap-1.5">
                    <Link href={`/musteriler/${d.id}`} className="flex flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
                      <span className="truncate text-sm font-medium">{d.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium tabular-nums text-danger">{formatPrice(d.debt)}</span>
                        {d.overdue && <Badge variant="danger">Gecikmiş</Badge>}
                      </span>
                    </Link>
                    {d.phone && (
                      <a href={waLink(d.phone)} target="_blank" rel="noopener noreferrer" title="WhatsApp'tan hatırlat" className="flex size-7 shrink-0 items-center justify-center rounded-md text-positive transition-colors hover:bg-positive/10">
                        <MessageCircle className="size-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Öncelikler / acil / son müşteriler */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4 text-primary" />Bugünün Öncelikleri</CardTitle></CardHeader>
          <CardContent>
            {priorities.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Her şey güncel, harika! ✨</p>
            ) : (
              <ul className="space-y-1">
                {priorities.map((p) => (
                  <li key={p.label}>
                    <Link href={p.href} className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted">
                      <span className="flex items-center gap-2"><ArrowRight className="size-3.5 text-muted-foreground" />{p.label}</span>
                      <Badge variant={p.tone}>{p.count}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className={cn(urgent.length > 0 && "border-danger/30")}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Zap className="size-4 text-danger" />Acil Aksiyonlar</CardTitle></CardHeader>
          <CardContent>
            {urgent.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-4 text-center text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-positive" />Acil bir şey yok.</p>
            ) : (
              <ul className="space-y-2">
                {urgent.map((u) => (
                  <li key={u.id}>
                    <Link href={u.href} className={cn("block rounded-lg border-l-4 bg-card p-2.5 shadow-xs transition-colors hover:bg-muted/50", u.tone === "danger" ? "border-l-danger" : "border-l-positive")}>
                      <p className="text-sm font-medium leading-tight">{u.title}</p>
                      <p className="text-xs text-muted-foreground">{u.detail}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="size-4 text-primary" />Son Eklenen Müşteriler</CardTitle>
            <Link href="/musteriler" className="text-xs text-primary hover:underline">Tümü →</Link>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Henüz müşteri eklenmedi.</p>
            ) : (
              <ul className="divide-y">
                {recentCustomers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/musteriler/${c.id}`} className="flex items-center justify-between gap-3 rounded-md px-1 py-2 transition-colors hover:bg-muted">
                      <span className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{c.full_name.slice(0, 2).toLocaleUpperCase("tr")}</span>
                        <span className="truncate text-sm font-medium">{c.full_name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
