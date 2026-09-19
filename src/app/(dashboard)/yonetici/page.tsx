import Link from "next/link";
import {
  Banknote,
  Users,
  ListChecks,
  PieChart,
  Coins,
  Tag,
  TrendingUp,
  TrendingDown,
  Crown,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  BarChart3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/guard";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { AgencyAccess } from "@/types/database";

import { NewExpenseButton } from "../giderler/new-expense-button";
import { TrendChart } from "../raporlar/charts";
import { RangeSelector } from "./range-selector";
import { AgencyPanelDialog } from "./agency-panel-dialog";

export const metadata = { title: "Yönetici Paneli" };

const MONTH_NAMES = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
const PALETTE = ["#5B5BD6", "#16A34A", "#F59E0B", "#0EA5E9", "#E11D48", "#8B5CF6", "#64748B"];

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const pickOne = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;
const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pct = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

function sourceColor(name: string, i: number): string {
  const n = name.toLocaleLowerCase("tr");
  if (n.includes("instagram")) return "#E1306C";
  if (n.includes("whatsapp")) return "#16A34A";
  if (n.includes("web") || n.includes("site")) return "#0EA5E9";
  if (n.includes("facebook") || n.includes("messenger")) return "#1877F2";
  if (n.includes("google")) return "#F59E0B";
  if (n.includes("tiktok")) return "#111827";
  return PALETTE[i % PALETTE.length];
}

const RANGE_MONTHS: Record<string, number> = { "5y": 60, "1y": 12, "6m": 6, "3m": 3, "1m": 1 };
const RANGE_LABEL: Record<string, string> = {
  "5y": "Son 5 yıl", "1y": "Son 1 yıl", "6m": "Son 6 ay",
  "3m": "Son 3 ay", "1m": "Son 1 ay", buay: "Bu ay", ozel: "Özel dönem",
};

function resolveRange(range: string, from: string | undefined, to: string | undefined, now: Date) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "ozel" && from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const span = Math.max(end.getTime() - start.getTime(), 86_400_000);
    const months = Math.round(span / (30 * 86_400_000));
    return {
      start, end,
      prevStart: new Date(start.getTime() - span),
      prevEnd: start,
      chartMonths: clamp(months, 3, 12),
    };
  }
  if (range === "buay") {
    return {
      start: startOfMonth, end: now,
      prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      prevEnd: startOfMonth,
      chartMonths: 3,
    };
  }
  const months = RANGE_MONTHS[range] ?? 12;
  const start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return {
    start, end: now,
    prevStart: new Date(now.getFullYear(), now.getMonth() - 2 * months, now.getDate()),
    prevEnd: start,
    chartMonths: clamp(months, 3, 12),
  };
}

export default async function YoneticiPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  // İşletme geneli finansal özet — yalnızca işletme sahibi.
  await requireCapability("raporlar");

  const { range = "1y", from, to } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const { start, end, prevStart, prevEnd, chartMonths } = resolveRange(range, from, to, now);

  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const prevStartISO = prevStart.toISOString();
  const prevEndISO = prevEnd.toISOString();
  const startDate = dateStr(start);
  const endDate = dateStr(end);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - (chartMonths - 1), 1);
  const chartStartISO = chartStart.toISOString();

  const sumAmt = (rows: { amount: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

  const [
    periodPayRes, prevPayRes, periodExpRes, periodApptRes, prevApptCount,
    customersTotalRes, newMonthRes, chartPayRes, chartCustRes, chartApptRes,
    packagesRes, leadCountRes, completedAllRes, noShowRes, cancelledRes,
    agencyRes,
  ] = await Promise.all([
    supabase.from("payments").select("amount, customer_id, customer:customers(source)").gte("created_at", startISO).lte("created_at", endISO),
    supabase.from("payments").select("amount").gte("created_at", prevStartISO).lt("created_at", prevEndISO),
    supabase.from("expenses").select("amount").gte("spent_at", startDate).lte("spent_at", endDate),
    supabase.from("appointments").select("price, service:services(name)").eq("status", "completed").gte("starts_at", startISO).lte("starts_at", endISO),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "completed").gte("starts_at", prevStartISO).lt("starts_at", prevEndISO),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", false),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", false).gte("created_at", startOfMonth.toISOString()),
    supabase.from("payments").select("amount, created_at").gte("created_at", chartStartISO),
    supabase.from("customers").select("created_at").eq("is_lead", false).gte("created_at", chartStartISO),
    supabase.from("appointments").select("starts_at").eq("status", "completed").gte("starts_at", chartStartISO),
    supabase.from("packages").select("price, paid_amount, purchased_at"),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", true),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "no_show"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase.from("agency_access").select("*").order("created_at", { ascending: false }),
  ]);

  const agencyAccesses = (agencyRes.data ?? []) as AgencyAccess[];

  // --- Finansal metrikler (dönem) ---
  const periodPay = (periodPayRes.data ?? []) as {
    amount: number | null;
    customer_id: string | null;
    customer: { source: string | null } | { source: string | null }[] | null;
  }[];
  const revenue = sumAmt(periodPay);
  const prevRevenue = sumAmt(prevPayRes.data);
  const expense = sumAmt(periodExpRes.data);
  const netProfit = revenue - expense;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const ciroDelta = pct(revenue, prevRevenue);

  const periodAppts = (periodApptRes.data ?? []) as {
    price: number | null;
    service: { name: string } | { name: string }[] | null;
  }[];
  const servicesSold = periodAppts.length;
  const prevServices = prevApptCount.count ?? 0;
  const servicesDelta = pct(servicesSold, prevServices);
  const serviceRevenue = periodAppts.reduce((s, a) => s + (a.price ?? 0), 0);
  const avgServiceFee = servicesSold > 0 ? serviceRevenue / servicesSold : 0;

  const payingCustomers = new Set(
    periodPay.map((p) => p.customer_id).filter(Boolean)
  ).size;
  const avgCustomerValue = payingCustomers > 0 ? revenue / payingCustomers : 0;

  const customersTotal = customersTotalRes.count ?? 0;
  const newMonth = newMonthRes.count ?? 0;

  // --- Kaynak bazlı gelir ---
  const srcMap = new Map<string, number>();
  for (const p of periodPay) {
    const name = pickOne(p.customer)?.source?.trim() || "Diğer";
    srcMap.set(name, (srcMap.get(name) ?? 0) + (p.amount ?? 0));
  }
  const srcSorted = [...srcMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const srcTop = srcSorted.slice(0, 4);
  const srcRest = srcSorted.slice(4).reduce((s, x) => s + x.value, 0);
  if (srcRest > 0) srcTop.push({ name: "Diğer", value: srcRest });
  const srcRows = srcTop
    .filter((r) => r.value > 0)
    .map((r, i) => ({ ...r, color: sourceColor(r.name, i) }));
  const srcMax = Math.max(...srcRows.map((r) => r.value), 1);

  // --- Trend grafiği (ciro / müşteri kümülatif / hizmet) ---
  const buckets: { key: string; label: string; ciro: number; yeni: number; hizmet: number }[] = [];
  for (let i = 0; i < chartMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (chartMonths - 1) + i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()], ciro: 0, yeni: 0, hizmet: 0 });
  }
  const bidx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of (chartPayRes.data ?? []) as { amount: number | null; created_at: string }[]) {
    const d = new Date(p.created_at);
    const i = bidx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].ciro += p.amount ?? 0;
  }
  for (const c of (chartCustRes.data ?? []) as { created_at: string }[]) {
    const d = new Date(c.created_at);
    const i = bidx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].yeni += 1;
  }
  for (const a of (chartApptRes.data ?? []) as { starts_at: string }[]) {
    const d = new Date(a.starts_at);
    const i = bidx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].hizmet += 1;
  }
  const newInWindow = buckets.reduce((s, b) => s + b.yeni, 0);
  const custBase = customersTotal - newInWindow;
  const chartData = buckets.map((b, i) => {
    const cum = custBase + buckets.slice(0, i + 1).reduce((s, x) => s + x.yeni, 0);
    return { label: b.label, ciro: b.ciro, musteri: cum, hizmet: b.hizmet };
  });

  // --- Tahsilat sağlığı ---
  let totalDebt = 0, overdueDebt = 0;
  for (const p of (packagesRes.data ?? []) as { price: number | null; paid_amount: number | null; purchased_at: string | null }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (debt <= 0) continue;
    totalDebt += debt;
    if (p.purchased_at && now.getTime() - new Date(p.purchased_at).getTime() > 30 * 86_400_000) overdueDebt += debt;
  }
  const collectionScore = totalDebt > 0 ? clamp(100 - (overdueDebt / totalDebt) * 100) : 100;

  // --- Sağlık skoru ---
  const leads = leadCountRes.count ?? 0;
  const conversion = customersTotal + leads > 0 ? (customersTotal / (customersTotal + leads)) * 100 : 0;
  const completedAll = completedAllRes.count ?? 0;
  const noShow = noShowRes.count ?? 0;
  const cancelled = cancelledRes.count ?? 0;
  const apptAll = completedAll + noShow + cancelled;
  const completionRate = apptAll > 0 ? (completedAll / apptAll) * 100 : null;
  const lostRate = apptAll > 0 ? ((noShow + cancelled) / apptAll) * 100 : 0;

  const factors = [
    { label: "Kârlılık", score: clamp((margin / 40) * 100), weight: 0.3 },
    { label: "Büyüme", score: ciroDelta === null ? 60 : clamp(50 + ciroDelta), weight: 0.25 },
    { label: "Tahsilat", score: collectionScore, weight: 0.2 },
    { label: "Dönüşüm", score: clamp(conversion), weight: 0.15 },
    { label: "Randevu Kalitesi", score: completionRate === null ? 60 : clamp(completionRate), weight: 0.1 },
  ];
  const healthScore = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const health = healthScore >= 75
    ? { label: "Sağlıklı", color: "#16A34A", tone: "text-positive" }
    : healthScore >= 50
      ? { label: "Orta", color: "#F59E0B", tone: "text-amber-600" }
      : { label: "Dikkat", color: "#E11D48", tone: "text-danger" };

  const risks: { text: string; tone: "danger" | "warning" }[] = [];
  if (netProfit < 0) risks.push({ text: `Bu dönem ${formatPrice(Math.abs(netProfit))} zarardasın.`, tone: "danger" });
  if (ciroDelta !== null && ciroDelta < 0) risks.push({ text: `Ciro önceki döneme göre %${Math.abs(ciroDelta)} düştü.`, tone: "warning" });
  if (overdueDebt > 0) risks.push({ text: `Gecikmiş tahsilat: ${formatPrice(overdueDebt)}.`, tone: "danger" });
  if (lostRate > 20) risks.push({ text: `Randevuların %${Math.round(lostRate)}'i iptal/gelmedi.`, tone: "warning" });
  if (customersTotal + leads > 0 && conversion < 30) risks.push({ text: `Lead dönüşüm oranı düşük (%${Math.round(conversion)}).`, tone: "warning" });

  // --- KPI kartları ---
  const kpis = [
    { label: "Toplam Ciro", value: formatPrice(revenue), icon: Banknote, tone: "bg-positive/10 text-positive", bar: "border-l-positive", delta: ciroDelta },
    { label: "Toplam Müşteri", value: customersTotal.toLocaleString("tr-TR"), icon: Users, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: newMonth > 0 ? `+${newMonth} bu ay` : undefined },
    { label: "Satılan Hizmet", value: servicesSold.toLocaleString("tr-TR"), icon: ListChecks, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", delta: servicesDelta },
    { label: "Net Kâr", value: formatPrice(netProfit), icon: PieChart, tone: netProfit >= 0 ? "bg-positive/10 text-positive" : "bg-danger/10 text-danger", bar: netProfit >= 0 ? "border-l-positive" : "border-l-danger", sub: `%${Math.round(margin)} marj`, accent: netProfit >= 0 ? "text-positive" : "text-danger" },
    { label: "Ort. Müşteri Değeri", value: formatPrice(avgCustomerValue), icon: Coins, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: "müşteri başına" },
    { label: "Ort. Hizmet Ücreti", value: formatPrice(avgServiceFee), icon: Tag, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: "hizmet başına" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yönetici Paneli"
        description="İşletmenin kazanç istatistikleri, kârlılık ve büyüme analizi."
      >
        <NewExpenseButton />
      </PageHeader>

      {/* Başlık satırı + dönem seçici */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="size-5 text-primary" />
          Kazanç İstatistikleri
          <span className="text-sm font-normal text-muted-foreground">· {RANGE_LABEL[range] ?? ""}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <AgencyPanelDialog existing={agencyAccesses} />
          <RangeSelector />
        </div>
      </div>

      {/* 6 KPI kartı */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          return (
            <div key={kpi.label} className="surface p-4">
              <p className="section-label">{kpi.label}</p>
              <p className={cn("mt-2 text-xl font-semibold tabular-nums tracking-tight", kpi.accent)}>{kpi.value}</p>
              {kpi.delta !== null && kpi.delta !== undefined && (
                <p className={cn("mt-1 flex items-center gap-0.5 text-xs font-medium", kpi.delta >= 0 ? "text-positive" : "text-danger")}>
                  {kpi.delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {kpi.delta >= 0 ? "+" : ""}%{kpi.delta}
                </p>
              )}
              {kpi.sub && <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Kaynak bazlı gelir — hangi kanal ne kadar kazandırıyor (Raporlar'da sadece adet var) */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Kaynak Bazlı Gelir
            </CardTitle>
            <CardDescription>Gelirin hangi kanaldan (Instagram, WhatsApp, Web…) geldiğini gösterir.</CardDescription>
          </div>
          <Link href="/raporlar" className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
            Hizmet & dönüşüm detayı <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {srcRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Bu dönemde kaynaklı gelir verisi yok.</p>
          ) : (
            <div className="space-y-3">
              {srcRows.map((r) => (
                <div key={r.name} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate text-muted-foreground">{r.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(r.value / srcMax) * 100}%`, background: r.color }} />
                  </div>
                  <span className="w-20 shrink-0 text-right font-medium tabular-nums">{formatPrice(r.value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend grafiği */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Aylık Ciro / Müşteri / Hizmet
          </CardTitle>
          <CardDescription>Ciro, toplam müşteri ve satılan hizmetin aylık seyri.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={chartData} />
        </CardContent>
      </Card>

      {/* Üstüne ekleme: Sağlık skoru + Risk */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="size-4 text-primary" />
              İşletme Sağlık Skoru
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
            <div
              className="relative size-32 shrink-0 rounded-full"
              style={{ background: `conic-gradient(${health.color} ${healthScore * 3.6}deg, #e5e7eb 0deg)` }}
            >
              <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-3xl font-bold tracking-tight">{healthScore}</span>
                <span className={cn("text-xs font-medium", health.tone)}>{health.label}</span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {factors.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums">{Math.round(f.score)}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", f.score >= 75 ? "bg-positive" : f.score >= 50 ? "bg-warning" : "bg-danger")}
                      style={{ width: `${clamp(f.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(risks.length > 0 ? "border-danger/30" : "border-positive/30")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {risks.length > 0 ? <ShieldAlert className="size-4 text-danger" /> : <ShieldCheck className="size-4 text-positive" />}
              Risk & Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <ShieldCheck className="size-8 text-positive" />
                <p className="text-sm font-medium">İşletme sağlıklı görünüyor 👍</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-lg border bg-card p-3 text-sm">
                    <ShieldAlert className={cn("mt-0.5 size-4 shrink-0", r.tone === "danger" ? "text-danger" : "text-amber-600")} />
                    {r.text}
                  </li>
                ))}
                <li className="pt-1">
                  <Link href="/raporlar" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    Detaylı analiz için Raporlar <ArrowRight className="size-3" />
                  </Link>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
