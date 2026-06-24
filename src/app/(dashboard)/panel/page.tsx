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
  CircleAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { formatTime, formatDate, formatPrice } from "@/lib/format";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

import { NewCustomerButton } from "../musteriler/new-customer-button";
import { RevenueAreaChart } from "../raporlar/charts";

const DAY = 86_400_000;
const MONTH_NAMES = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

type TodayAppointment = {
  id: string;
  starts_at: string;
  status: string | null;
  customer: { full_name: string } | null;
  service: { name: string } | null;
};

type RecentCustomer = {
  id: string;
  full_name: string;
  created_at: string;
};

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function daysUntilBirthday(birthday: string, today: Date): number | null {
  const [, m, d] = birthday.split("-").map(Number);
  if (!m || !d) return null;
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < todayMid.getTime()) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
  }
  return Math.round((next.getTime() - todayMid.getTime()) / DAY);
}

export default async function PanelPage() {
  const { fullName, email } = await getAccountContext();
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const [
    customersCount,
    newMonthCount,
    monthPayRes,
    lastMonthPayRes,
    pendingCount,
    todayRes,
    packagesRes,
    birthdayRes,
    inactiveCount,
    recentRes,
    sixMonthPayRes,
    leadsCount,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("payments")
      .select("amount")
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("payments")
      .select("amount")
      .gte("created_at", startOfLastMonth.toISOString())
      .lt("created_at", startOfMonth.toISOString()),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "planned")
      .gte("starts_at", now.toISOString()),
    supabase
      .from("appointments")
      .select("id, starts_at, status, customer:customers(full_name), service:services(name)")
      .gte("starts_at", startOfToday.toISOString())
      .lt("starts_at", endOfToday.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("packages")
      .select("customer_id, price, paid_amount, remaining_sessions, purchased_at, customer:customers(full_name)"),
    supabase
      .from("customers")
      .select("id, full_name, birthday")
      .not("birthday", "is", null),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .not("last_visit_at", "is", null)
      .lte("last_visit_at", ninetyDaysAgo.toISOString()),
    supabase
      .from("customers")
      .select("id, full_name, created_at")
      .eq("is_lead", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("amount, created_at")
      .gte("created_at", sixMonthsAgo.toISOString()),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", true),
  ]);

  const todayAppointments = (todayRes.data ?? []) as unknown as TodayAppointment[];
  const recentCustomers = (recentRes.data ?? []) as RecentCustomer[];

  // --- Ciro (bu ay / geçen ay) ---
  const monthRevenue = ((monthPayRes.data ?? []) as { amount: number | null }[])
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const lastMonthRevenue = ((lastMonthPayRes.data ?? []) as { amount: number | null }[])
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const revenuePct =
    lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

  // --- Borç / tahsil edilecek (paketlerden, müşteri bazında) ---
  type Debtor = { id: string; name: string; debt: number; overdue: boolean };
  const debtorMap = new Map<string, Debtor>();
  for (const p of (packagesRes.data ?? []) as {
    customer_id: string | null;
    price: number | null;
    paid_amount: number | null;
    purchased_at: string | null;
    customer: { full_name: string } | { full_name: string }[] | null;
  }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (debt <= 0 || !p.customer_id) continue;
    const overdue =
      !!p.purchased_at &&
      now.getTime() - new Date(p.purchased_at).getTime() > 30 * DAY;
    const existing = debtorMap.get(p.customer_id);
    if (existing) {
      existing.debt += debt;
      existing.overdue = existing.overdue || overdue;
    } else {
      debtorMap.set(p.customer_id, {
        id: p.customer_id,
        name: pickOne(p.customer)?.full_name ?? "—",
        debt,
        overdue,
      });
    }
  }
  const debtors = [...debtorMap.values()].sort((a, b) => b.debt - a.debt);
  const totalDebt = debtors.reduce((s, d) => s + d.debt, 0);
  const overdueDebtors = debtors.filter((d) => d.overdue);

  // --- Fırsatlar ---
  const endingCount = ((packagesRes.data ?? []) as { remaining_sessions: number | null }[])
    .filter((p) => (p.remaining_sessions ?? 0) > 0 && (p.remaining_sessions ?? 0) <= 2)
    .length;
  const birthdayUpcoming = ((birthdayRes.data ?? []) as { id: string; full_name: string; birthday: string }[])
    .map((c) => ({ ...c, days: daysUntilBirthday(c.birthday, now) }))
    .filter((c): c is { id: string; full_name: string; birthday: string; days: number } => c.days !== null);
  const birthdayWeek = birthdayUpcoming.filter((c) => c.days <= 7);
  const birthdayToday = birthdayUpcoming.filter((c) => c.days === 0);
  const inactive90 = inactiveCount.count ?? 0;
  const oppTotal = endingCount + inactive90 + birthdayWeek.length;

  // --- Aylık gelir grafiği (son 6 ay) ---
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()], value: 0 });
  }
  const bucketIdx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of (sixMonthPayRes.data ?? []) as { amount: number | null; created_at: string }[]) {
    const d = new Date(p.created_at);
    const idx = bucketIdx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) buckets[idx].value += p.amount ?? 0;
  }
  const revenueData = buckets.map(({ label, value }) => ({ label, value }));

  const customerTotal = customersCount.count ?? 0;
  const newThisMonth = newMonthCount.count ?? 0;
  const pendingAppt = pendingCount.count ?? 0;
  const leadTotal = leadsCount.count ?? 0;

  // --- KPI kartları ---
  const kpis = [
    {
      label: "Toplam Müşteri",
      value: customerTotal.toLocaleString("tr-TR"),
      icon: Users,
      tone: "bg-primary/10 text-primary",
      bar: "border-l-primary",
      trend: newThisMonth > 0 ? { up: true, text: `+${newThisMonth} bu ay` } : null,
      href: "/musteriler",
    },
    {
      label: "Bu Ay Ciro",
      value: formatPrice(monthRevenue),
      icon: Banknote,
      tone: "bg-positive/10 text-positive",
      bar: "border-l-positive",
      trend:
        revenuePct !== null
          ? { up: revenuePct >= 0, text: `${revenuePct >= 0 ? "+" : ""}%${revenuePct}` }
          : null,
      href: "/tahsilat",
    },
    {
      label: "Bekleyen Randevu",
      value: pendingAppt.toLocaleString("tr-TR"),
      icon: CalendarDays,
      tone: "bg-warning/12 text-amber-600",
      bar: "border-l-warning",
      sub: `Bugün ${todayAppointments.length}`,
      href: "/randevular",
    },
    {
      label: "Tahsil Edilecek",
      value: formatPrice(totalDebt),
      icon: Wallet,
      tone: "bg-danger/10 text-danger",
      bar: "border-l-danger",
      sub: `${debtors.length} müşteri`,
      href: "/cari",
    },
  ];

  // --- Bugünün öncelikleri (yönlendirmeli) ---
  const priorities = [
    { label: "Bekleyen randevuları kontrol et", count: pendingAppt, href: "/randevular", tone: "warning" as const },
    { label: "Tahsilat bekleyen müşteriler", count: debtors.length, href: "/cari", tone: "danger" as const },
    { label: "Değerlendirilecek fırsatlar", count: oppTotal, href: "/firsatlar", tone: "info" as const },
    { label: "Takip edilecek lead'ler", count: leadTotal, href: "/leadler", tone: "secondary" as const },
  ].filter((p) => p.count > 0);

  // --- Acil aksiyonlar ---
  const urgent: { id: string; title: string; detail: string; href: string; tone: "danger" | "warning" | "positive" }[] = [];
  for (const d of overdueDebtors.slice(0, 3)) {
    urgent.push({
      id: `debt-${d.id}`,
      title: "Gecikmiş ödeme",
      detail: `${d.name} · ${formatPrice(d.debt)}`,
      href: "/cari",
      tone: "danger",
    });
  }
  for (const b of birthdayToday.slice(0, 3)) {
    urgent.push({
      id: `bd-${b.id}`,
      title: "Bugün doğum günü 🎂",
      detail: `${b.full_name} · tebrik et`,
      href: "/firsatlar",
      tone: "positive",
    });
  }

  const opportunities = [
    { label: "Paketi bitmek üzere", count: endingCount, icon: PackageX, tone: "text-amber-600 bg-warning/12" },
    { label: "90+ gündür gelmeyen", count: inactive90, icon: Clock3, tone: "text-danger bg-danger/10" },
    { label: "Bu hafta doğum günü", count: birthdayWeek.length, icon: Cake, tone: "text-positive bg-positive/10" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genel Bakış"
        description={`Hoş geldin ${fullName ?? email} — işletmenin bugünkü durumu.`}
      >
        <NewCustomerButton />
      </PageHeader>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className={cn("h-full border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md", kpi.bar)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <span className={cn("flex size-9 items-center justify-center rounded-lg", kpi.tone)}>
                    <Icon className="size-5" />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                  {kpi.trend && (
                    <p className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-medium",
                      kpi.trend.up ? "text-positive" : "text-danger"
                    )}>
                      {kpi.trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {kpi.trend.text}
                    </p>
                  )}
                  {kpi.sub && (
                    <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Orta blok */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bugünkü randevular */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" />
              Bugünkü Randevular
            </CardTitle>
            <Link href="/takvim" className="text-sm text-primary hover:underline">
              Takvim →
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Bugün için planlanmış randevu yok.
              </p>
            ) : (
              <ul className="divide-y">
                {todayAppointments.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold text-primary">
                        {formatTime(a.starts_at)}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {a.customer?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.service?.name ?? "Hizmet belirtilmedi"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={appointmentStatusVariant(a.status)}>
                      {appointmentStatusLabel(a.status)}
                    </Badge>
                  </li>
                ))}
                {todayAppointments.length > 6 && (
                  <li className="pt-2.5">
                    <Link href="/randevular" className="text-sm text-primary hover:underline">
                      +{todayAppointments.length - 6} randevu daha →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sağ kolon: fırsatlar + tahsil edilecek */}
        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                Para Kazandıracak Fırsatlar
              </CardTitle>
              <Link href="/firsatlar" className="text-xs text-primary hover:underline">
                Tümü →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities.map((o) => {
                const Icon = o.icon;
                return (
                  <div key={o.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={cn("flex size-7 items-center justify-center rounded-md", o.tone)}>
                        <Icon className="size-4" />
                      </span>
                      {o.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{o.count} kişi</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="size-4 text-positive" />
                Tahsil Edilecek
              </CardTitle>
              <span className="text-sm font-bold text-positive">{formatPrice(totalDebt)}</span>
            </CardHeader>
            <CardContent>
              {debtors.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Açık ödeme yok 🎉
                </p>
              ) : (
                <ul className="space-y-2">
                  {debtors.slice(0, 4).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{d.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium tabular-nums text-danger">
                          {formatPrice(d.debt)}
                        </span>
                        {d.overdue && <Badge variant="danger">Gecikmiş</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Aylık gelir grafiği */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Aylık Gelir
          </CardTitle>
          <CardDescription>Son 6 ayda tahsil edilen ödemeler.</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueAreaChart data={revenueData} />
        </CardContent>
      </Card>

      {/* Alt blok: öncelikler / acil / son müşteriler */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bugünün öncelikleri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" />
              Bugünün Öncelikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorities.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Her şey güncel, harika! ✨
              </p>
            ) : (
              <ul className="space-y-1">
                {priorities.map((p) => (
                  <li key={p.label}>
                    <Link
                      href={p.href}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        {p.label}
                      </span>
                      <Badge variant={p.tone}>{p.count}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Acil aksiyonlar */}
        <Card className={cn(urgent.length > 0 && "border-danger/30")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4 text-danger" />
              Acil Aksiyonlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {urgent.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-4 text-center text-sm text-muted-foreground">
                <CircleAlert className="size-4" />
                Acil bir şey yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {urgent.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={u.href}
                      className={cn(
                        "block rounded-lg border-l-4 bg-card p-2.5 shadow-xs transition-colors hover:bg-muted/50",
                        u.tone === "danger" && "border-l-danger",
                        u.tone === "warning" && "border-l-warning",
                        u.tone === "positive" && "border-l-positive"
                      )}
                    >
                      <p className="text-sm font-medium leading-tight">{u.title}</p>
                      <p className="text-xs text-muted-foreground">{u.detail}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Son eklenen müşteriler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" />
              Son Eklenen Müşteriler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Henüz müşteri eklenmedi.
              </p>
            ) : (
              <ul className="divide-y">
                {recentCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm font-medium">{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </span>
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
