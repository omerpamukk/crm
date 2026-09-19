import {
  BarChart3,
  Banknote,
  TrendingUp,
  Receipt,
  Users,
  CalendarCheck,
  Target,
  UserCog,
  PieChart as PieIcon,
  PiggyBank,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/guard";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RevenueAreaChart,
  RevenueExpenseChart,
  ServiceBarChart,
  SourcePieChart,
} from "./charts";

export const metadata = { title: "Raporlar" };

const MONTH_NAMES = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function RaporlarPage() {
  // Ciro, komisyon ve kâr verisi — yalnızca işletme sahibi.
  await requireCapability("raporlar");

  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Son 6 ayın başlangıcı (bu ay dahil)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    paymentsRes,
    completedApptRes,
    customersRes,
    leadCountRes,
    customerCountRes,
    apptCountRes,
    completedCountRes,
    staffRes,
    expensesRes,
  ] = await Promise.all([
    // 1) Son 6 ay tahsilatları (aylık ciro)
    supabase
      .from("payments")
      .select("amount, created_at")
      .gte("created_at", sixMonthsAgo.toISOString()),
    // 2) Tamamlanan randevular — hizmet + personel bazlı ciro
    supabase
      .from("appointments")
      .select("price, staff_member_id, service:services(name)")
      .eq("status", "completed")
      .not("price", "is", null),
    // 3) Müşteri kaynak dağılımı
    supabase.from("customers").select("source"),
    // 4) Dönüşüm hunisi sayıları
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", true),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    // 5) Personel (komisyon oranlarıyla)
    supabase.from("staff").select("id, full_name, commission_rate"),
    // 6) Son 6 ay giderleri (kâr-zarar)
    supabase.from("expenses").select("amount, spent_at").gte("spent_at", sixMonthsAgo.toISOString().slice(0, 10)),
  ]);

  // --- Aylık ciro (son 6 ay) ---
  const monthBuckets: { key: string; label: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_NAMES[d.getMonth()],
      value: 0,
    });
  }
  const bucketIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
  let totalRevenue = 0;
  let monthRevenue = 0;
  for (const p of (paymentsRes.data ?? []) as {
    amount: number | null;
    created_at: string;
  }[]) {
    const amount = p.amount ?? 0;
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = bucketIndex.get(key);
    if (idx !== undefined) {
      monthBuckets[idx].value += amount;
      totalRevenue += amount;
    }
    if (d >= startOfMonth) monthRevenue += amount;
  }
  const revenueData = monthBuckets.map(({ label, value }) => ({
    label,
    value,
  }));

  // --- Kâr & Zarar (gelir - gider, son 6 ay) ---
  const expenseBuckets = monthBuckets.map(() => 0);
  let totalExpense = 0;
  for (const e of (expensesRes.data ?? []) as { amount: number | null; spent_at: string }[]) {
    const d = new Date(e.spent_at);
    const idx = bucketIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) {
      expenseBuckets[idx] += e.amount ?? 0;
      totalExpense += e.amount ?? 0;
    }
  }
  const profitData = monthBuckets.map((b, i) => ({ label: b.label, gelir: b.value, gider: expenseBuckets[i] }));
  const netProfit = totalRevenue - totalExpense;
  const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // --- Hizmet + personel bazlı ciro ---
  const completedAppts = (completedApptRes.data ?? []) as {
    price: number | null;
    staff_member_id: string | null;
    service: { name: string } | { name: string }[] | null;
  }[];

  const serviceMap = new Map<string, number>();
  for (const a of completedAppts) {
    const svc = pickOne(a.service);
    const name = svc?.name ?? "Diğer";
    serviceMap.set(name, (serviceMap.get(name) ?? 0) + (a.price ?? 0));
  }
  const serviceData = [...serviceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // --- Müşteri kaynak dağılımı ---
  const sourceMap = new Map<string, number>();
  for (const c of (customersRes.data ?? []) as { source: string | null }[]) {
    const key = c.source?.trim() || "Belirtilmemiş";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const sourceData = [...sourceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // --- Dönüşüm hunisi ---
  const leadCount = leadCountRes.count ?? 0;
  const customerCount = customerCountRes.count ?? 0;
  const apptCount = apptCountRes.count ?? 0;
  const completedCount = completedCountRes.count ?? 0;
  const totalPeople = leadCount + customerCount;
  const conversionPct =
    totalPeople > 0 ? Math.round((customerCount / totalPeople) * 100) : 0;

  const funnel = [
    {
      label: "Toplam Kişi",
      value: totalPeople,
      icon: Users,
      tone: "bg-primary/10 text-primary",
      bar: "bg-primary",
    },
    {
      label: "Müşteriye Dönen",
      value: customerCount,
      icon: Target,
      tone: "bg-positive/10 text-positive",
      bar: "bg-positive",
    },
    {
      label: "Randevu Oluşturulan",
      value: apptCount,
      icon: CalendarCheck,
      tone: "bg-warning/12 text-amber-600",
      bar: "bg-warning",
    },
    {
      label: "Tamamlanan Randevu",
      value: completedCount,
      icon: CalendarCheck,
      tone: "bg-positive/10 text-positive",
      bar: "bg-positive",
    },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  // --- Personel performansı (tamamlanan randevulardan) ---
  const staffList = (staffRes.data ?? []) as {
    id: string;
    full_name: string;
    commission_rate: number | null;
  }[];
  const staffAgg = new Map<string, { count: number; revenue: number }>();
  for (const a of completedAppts) {
    if (!a.staff_member_id) continue;
    const cur = staffAgg.get(a.staff_member_id) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += a.price ?? 0;
    staffAgg.set(a.staff_member_id, cur);
  }
  const staffPerf = staffList
    .map((s) => {
      const agg = staffAgg.get(s.id) ?? { count: 0, revenue: 0 };
      const rate = s.commission_rate ?? 0;
      return {
        id: s.id,
        name: s.full_name,
        count: agg.count,
        revenue: agg.revenue,
        rate,
        commission: (agg.revenue * rate) / 100,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const kpis = [
    {
      label: "Bu Ay Tahsilat",
      value: formatPrice(monthRevenue),
      icon: Banknote,
      tone: "bg-positive/10 text-positive",
      accent: "text-positive",
    },
    {
      label: "Son 6 Ay Toplam",
      value: formatPrice(totalRevenue),
      icon: TrendingUp,
      tone: "bg-primary/10 text-primary",
      accent: "",
    },
    {
      label: "Tamamlanan Randevu",
      value: String(completedCount),
      icon: Receipt,
      tone: "bg-warning/12 text-amber-600",
      accent: "",
    },
    {
      label: "Lead Dönüşüm",
      value: `%${conversionPct}`,
      icon: Target,
      tone: "bg-primary/10 text-primary",
      accent: "",
    },
  ];

  const hasAnyData =
    totalRevenue > 0 ||
    serviceData.length > 0 ||
    totalPeople > 0 ||
    sourceData.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="İşletmenin gelir, hizmet ve dönüşüm performansına analitik bakış."
      />

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title="Henüz raporlanacak veri yok"
          description="Müşteri, randevu ve tahsilat ekledikçe aylık ciro, hizmet performansı ve dönüşüm grafikleri burada otomatik oluşacak."
        />
      ) : (
        <>
          {/* KPI kartları */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </CardTitle>
                    <span
                      className={`flex size-9 items-center justify-center rounded-lg ${kpi.tone}`}
                    >
                      <Icon className="size-5" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${kpi.accent}`}>
                      {kpi.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Aylık ciro grafiği */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Aylık Ciro (Son 6 Ay)
              </CardTitle>
              <CardDescription>
                Tahsil edilen ödemelerin aylara göre dağılımı.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueAreaChart data={revenueData} />
            </CardContent>
          </Card>

          {/* Kâr & Zarar — Gelir vs Gider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PiggyBank className="size-4 text-primary" />
                Kâr & Zarar (Son 6 Ay)
              </CardTitle>
              <CardDescription>Gelir (tahsilat) ile gider karşılaştırması ve net kâr.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-l-4 border-l-positive bg-card p-3">
                  <p className="text-xs text-muted-foreground">Gelir</p>
                  <p className="text-lg font-bold tabular-nums text-positive">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="rounded-lg border border-l-4 border-l-danger bg-card p-3">
                  <p className="text-xs text-muted-foreground">Gider</p>
                  <p className="text-lg font-bold tabular-nums text-danger">{formatPrice(totalExpense)}</p>
                </div>
                <div className={`rounded-lg border border-l-4 bg-card p-3 ${netProfit >= 0 ? "border-l-positive" : "border-l-danger"}`}>
                  <p className="text-xs text-muted-foreground">Net Kâr · %{margin} marj</p>
                  <p className={`text-lg font-bold tabular-nums ${netProfit >= 0 ? "text-positive" : "text-danger"}`}>{formatPrice(netProfit)}</p>
                </div>
              </div>
              <RevenueExpenseChart data={profitData} />
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Hizmet bazlı ciro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4 text-primary" />
                  Hizmet Bazlı Ciro
                </CardTitle>
                <CardDescription>
                  Tamamlanan randevulardan elde edilen gelir (ilk 8 hizmet).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {serviceData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Henüz tamamlanmış, fiyatlı randevu yok.
                  </p>
                ) : (
                  <ServiceBarChart data={serviceData} />
                )}
              </CardContent>
            </Card>

            {/* Kaynak dağılımı */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieIcon className="size-4 text-primary" />
                  Müşteri Kaynak Dağılımı
                </CardTitle>
                <CardDescription>
                  Müşterilerin geldiği kanalların oranı.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sourceData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Henüz kaynak verisi yok.
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <SourcePieChart data={sourceData} />
                    </div>
                    <ul className="w-full space-y-1.5 sm:w-1/2">
                      {sourceData.slice(0, 7).map((s) => (
                        <li
                          key={s.name}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate text-muted-foreground">
                            {s.name}
                          </span>
                          <span className="font-medium tabular-nums">
                            {s.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dönüşüm hunisi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" />
                Dönüşüm Hunisi
              </CardTitle>
              <CardDescription>
                Lead&apos;den tamamlanan randevuya kadar müşteri yolculuğu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnel.map((f) => {
                  const Icon = f.icon;
                  const pct = Math.round((f.value / funnelMax) * 100);
                  return (
                    <div key={f.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            className={`flex size-7 items-center justify-center rounded-md ${f.tone}`}
                          >
                            <Icon className="size-4" />
                          </span>
                          {f.label}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {f.value}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${f.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Personel performansı */}
          {staffPerf.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCog className="size-4 text-primary" />
                  Personel Performansı
                </CardTitle>
                <CardDescription>
                  Tamamlanan randevulardan personel bazlı ciro ve hak edilen
                  komisyon.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Personel</TableHead>
                      <TableHead className="text-right">Randevu</TableHead>
                      <TableHead className="text-right">Ciro</TableHead>
                      <TableHead className="text-right">Komisyon %</TableHead>
                      <TableHead className="pr-6 text-right">
                        Hak Ediş
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffPerf.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="pl-6 font-medium">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(s.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {s.rate > 0 ? `%${s.rate}` : "—"}
                        </TableCell>
                        <TableCell className="pr-6 text-right font-semibold tabular-nums text-positive">
                          {s.commission > 0 ? formatPrice(s.commission) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
