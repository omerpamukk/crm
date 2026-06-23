import Link from "next/link";
import {
  Crown,
  Banknote,
  Receipt,
  TrendingUp,
  TrendingDown,
  Percent,
  Scissors,
  UserCog,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
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

import { RevenueExpenseChart } from "../raporlar/charts";

const MONTH_NAMES = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function YoneticiPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startMonthISO = startOfMonth.toISOString();
  const startLastMonthISO = startOfLastMonth.toISOString();
  const startMonthDate = dateStr(startOfMonth);
  const startLastMonthDate = dateStr(startOfLastMonth);
  const sixMonthsDate = dateStr(sixMonthsAgo);

  const sum = (rows: { amount: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

  const [
    monthPayRes,
    lastMonthPayRes,
    monthExpRes,
    lastMonthExpRes,
    sixPayRes,
    sixExpRes,
    activeCount,
    leadCount,
    newThisRes,
    newLastRes,
    completedCount,
    noShowCount,
    cancelledCount,
    completedApptRes,
    packagesRes,
  ] = await Promise.all([
    supabase.from("payments").select("amount").gte("created_at", startMonthISO),
    supabase
      .from("payments")
      .select("amount")
      .gte("created_at", startLastMonthISO)
      .lt("created_at", startMonthISO),
    supabase.from("expenses").select("amount").gte("spent_at", startMonthDate),
    supabase
      .from("expenses")
      .select("amount")
      .gte("spent_at", startLastMonthDate)
      .lt("spent_at", startMonthDate),
    supabase
      .from("payments")
      .select("amount, created_at")
      .gte("created_at", sixMonthsAgo.toISOString()),
    supabase
      .from("expenses")
      .select("amount, spent_at")
      .gte("spent_at", sixMonthsDate),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", true),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false)
      .gte("created_at", startMonthISO),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false)
      .gte("created_at", startLastMonthISO)
      .lt("created_at", startMonthISO),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "no_show"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled"),
    supabase
      .from("appointments")
      .select("price, service:services(name), staff_member:staff(full_name)")
      .eq("status", "completed")
      .not("price", "is", null),
    supabase
      .from("packages")
      .select("price, paid_amount, purchased_at"),
  ]);

  // --- Finansal ---
  const revenue = sum(monthPayRes.data);
  const lastRevenue = sum(lastMonthPayRes.data);
  const expense = sum(monthExpRes.data);
  const lastExpense = sum(lastMonthExpRes.data);
  const netProfit = revenue - expense;
  const lastNet = lastRevenue - lastExpense;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const revGrowth =
    lastRevenue > 0
      ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100)
      : null;
  const netGrowth =
    lastNet !== 0
      ? Math.round(((netProfit - lastNet) / Math.abs(lastNet)) * 100)
      : null;

  // --- Müşteri / dönüşüm ---
  const active = activeCount.count ?? 0;
  const leads = leadCount.count ?? 0;
  const conversion =
    active + leads > 0 ? (active / (active + leads)) * 100 : 0;
  const newThis = newThisRes.count ?? 0;
  const newLast = newLastRes.count ?? 0;

  // --- Randevu kalitesi ---
  const completed = completedCount.count ?? 0;
  const noShow = noShowCount.count ?? 0;
  const cancelled = cancelledCount.count ?? 0;
  const apptTotal = completed + noShow + cancelled;
  const completionRate = apptTotal > 0 ? (completed / apptTotal) * 100 : null;
  const lostRate = apptTotal > 0 ? ((noShow + cancelled) / apptTotal) * 100 : 0;

  // --- Tahsilat sağlığı ---
  let totalDebt = 0;
  let overdueDebt = 0;
  for (const p of (packagesRes.data ?? []) as {
    price: number | null;
    paid_amount: number | null;
    purchased_at: string | null;
  }[]) {
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (debt <= 0) continue;
    totalDebt += debt;
    const overdue =
      !!p.purchased_at &&
      now.getTime() - new Date(p.purchased_at).getTime() > 30 * 86_400_000;
    if (overdue) overdueDebt += debt;
  }
  const collectionScore =
    totalDebt > 0 ? clamp(100 - (overdueDebt / totalDebt) * 100) : 100;

  // --- En kârlı hizmet / personel ---
  const svcMap = new Map<string, number>();
  const staffMap = new Map<string, number>();
  for (const a of (completedApptRes.data ?? []) as {
    price: number | null;
    service: { name: string } | { name: string }[] | null;
    staff_member: { full_name: string } | { full_name: string }[] | null;
  }[]) {
    const svc = pickOne(a.service)?.name;
    if (svc) svcMap.set(svc, (svcMap.get(svc) ?? 0) + (a.price ?? 0));
    const stf = pickOne(a.staff_member)?.full_name;
    if (stf) staffMap.set(stf, (staffMap.get(stf) ?? 0) + (a.price ?? 0));
  }
  const topService = [...svcMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topStaff = [...staffMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  // --- İşletme sağlık skoru ---
  const profScore = clamp((margin / 40) * 100);
  const growthScore =
    revGrowth === null ? 60 : clamp(50 + revGrowth);
  const convScore = clamp(conversion);
  const complScore = completionRate === null ? 60 : clamp(completionRate);
  const factors = [
    { label: "Kârlılık", score: profScore, weight: 0.3 },
    { label: "Büyüme", score: growthScore, weight: 0.25 },
    { label: "Tahsilat", score: collectionScore, weight: 0.2 },
    { label: "Dönüşüm", score: convScore, weight: 0.15 },
    { label: "Randevu Kalitesi", score: complScore, weight: 0.1 },
  ];
  const healthScore = Math.round(
    factors.reduce((s, f) => s + f.score * f.weight, 0)
  );
  const health =
    healthScore >= 75
      ? { label: "Sağlıklı", color: "#16A34A", tone: "text-positive" }
      : healthScore >= 50
        ? { label: "Orta", color: "#F59E0B", tone: "text-amber-600" }
        : { label: "Dikkat", color: "#E11D48", tone: "text-danger" };

  // --- Gelir/gider grafiği ---
  const buckets: { key: string; label: string; gelir: number; gider: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_NAMES[d.getMonth()],
      gelir: 0,
      gider: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of (sixPayRes.data ?? []) as { amount: number | null; created_at: string }[]) {
    const d = new Date(p.created_at);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].gelir += p.amount ?? 0;
  }
  for (const e of (sixExpRes.data ?? []) as { amount: number | null; spent_at: string }[]) {
    const d = new Date(e.spent_at);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].gider += e.amount ?? 0;
  }
  const chartData = buckets.map(({ label, gelir, gider }) => ({ label, gelir, gider }));

  // --- Risk uyarıları ---
  const risks: { text: string; tone: "danger" | "warning" }[] = [];
  if (netProfit < 0)
    risks.push({ text: `Bu ay ${formatPrice(Math.abs(netProfit))} zarardasın.`, tone: "danger" });
  if (revGrowth !== null && revGrowth < 0)
    risks.push({ text: `Ciro geçen aya göre %${Math.abs(revGrowth)} düştü.`, tone: "warning" });
  if (overdueDebt > 0)
    risks.push({ text: `Gecikmiş tahsilat: ${formatPrice(overdueDebt)}.`, tone: "danger" });
  if (lostRate > 20)
    risks.push({ text: `Randevuların %${Math.round(lostRate)}'i iptal/gelmedi.`, tone: "warning" });
  if (active + leads > 0 && conversion < 30)
    risks.push({ text: `Lead dönüşüm oranı düşük (%${Math.round(conversion)}).`, tone: "warning" });

  const finance = [
    {
      label: "Bu Ay Ciro",
      value: formatPrice(revenue),
      icon: Banknote,
      tone: "bg-positive/10 text-positive",
      growth: revGrowth,
    },
    {
      label: "Bu Ay Gider",
      value: formatPrice(expense),
      icon: Receipt,
      tone: "bg-danger/10 text-danger",
      growth: null,
    },
    {
      label: "Net Kâr",
      value: formatPrice(netProfit),
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      tone: netProfit >= 0 ? "bg-positive/10 text-positive" : "bg-danger/10 text-danger",
      growth: netGrowth,
      accent: netProfit >= 0 ? "text-positive" : "text-danger",
    },
    {
      label: "Kâr Marjı",
      value: `%${Math.round(margin)}`,
      icon: Percent,
      tone: "bg-primary/10 text-primary",
      growth: null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yönetici Paneli"
        description="İşletmenin finansal sağlığı, büyümesi ve riskleri tek ekranda."
      />

      {/* Sağlık skoru + finansal özet */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sağlık skoru */}
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
              style={{
                background: `conic-gradient(${health.color} ${healthScore * 3.6}deg, #e5e7eb 0deg)`,
              }}
            >
              <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-3xl font-bold tracking-tight">
                  {healthScore}
                </span>
                <span className={cn("text-xs font-medium", health.tone)}>
                  {health.label}
                </span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {factors.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums">
                      {Math.round(f.score)}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        f.score >= 75
                          ? "bg-positive"
                          : f.score >= 50
                            ? "bg-warning"
                            : "bg-danger"
                      )}
                      style={{ width: `${clamp(f.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Finansal özet (4 kart 2x2) */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {finance.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {f.label}
                  </CardTitle>
                  <span className={cn("flex size-9 items-center justify-center rounded-lg", f.tone)}>
                    <Icon className="size-5" />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold tracking-tight", f.accent)}>
                    {f.value}
                  </div>
                  {f.growth !== null && f.growth !== undefined && (
                    <p className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-medium",
                      f.growth >= 0 ? "text-positive" : "text-danger"
                    )}>
                      {f.growth >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {f.growth >= 0 ? "+" : ""}%{f.growth} (geçen aya göre)
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Gelir vs Gider grafiği */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Gelir / Gider Karşılaştırması
          </CardTitle>
          <CardDescription>Son 6 ayda tahsilat ve giderler.</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueExpenseChart data={chartData} />
        </CardContent>
      </Card>

      {/* Performans + Risk */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* En iyi performans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-positive" />
              En İyi Performans
            </CardTitle>
            <CardDescription>Tamamlanan randevulara göre.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <span className="flex items-center gap-2.5 text-sm">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Scissors className="size-4" />
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">En kârlı hizmet</span>
                  <span className="font-medium">{topService?.[0] ?? "—"}</span>
                </span>
              </span>
              <span className="font-semibold tabular-nums text-positive">
                {topService ? formatPrice(topService[1]) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <span className="flex items-center gap-2.5 text-sm">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserCog className="size-4" />
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">En çok ciro yapan personel</span>
                  <span className="font-medium">{topStaff?.[0] ?? "—"}</span>
                </span>
              </span>
              <span className="font-semibold tabular-nums text-positive">
                {topStaff ? formatPrice(topStaff[1]) : "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">{newThis}</p>
                <p className="text-xs text-muted-foreground">
                  Bu ay yeni müşteri
                  {newLast > 0 && (
                    <span className={cn("ml-1", newThis >= newLast ? "text-positive" : "text-danger")}>
                      ({newThis >= newLast ? "+" : ""}{newThis - newLast})
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">
                  {completionRate === null ? "—" : `%${Math.round(completionRate)}`}
                </p>
                <p className="text-xs text-muted-foreground">Randevu tamamlanma</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk uyarıları */}
        <Card className={cn(risks.length > 0 ? "border-danger/30" : "border-positive/30")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {risks.length > 0 ? (
                <ShieldAlert className="size-4 text-danger" />
              ) : (
                <ShieldCheck className="size-4 text-positive" />
              )}
              Risk & Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <ShieldCheck className="size-8 text-positive" />
                <p className="text-sm font-medium">İşletme sağlıklı görünüyor 👍</p>
                <p className="text-xs text-muted-foreground">
                  Şu an öne çıkan bir risk yok.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {risks.map((r, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border-l-4 bg-card p-3 text-sm shadow-xs",
                      r.tone === "danger" ? "border-l-danger" : "border-l-warning"
                    )}
                  >
                    <ShieldAlert
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        r.tone === "danger" ? "text-danger" : "text-amber-600"
                      )}
                    />
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
