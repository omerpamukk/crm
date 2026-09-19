import { ShoppingBag, Banknote, Scale, ListChecks, Coins, Hourglass, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { NewPaymentButton } from "./new-payment-button";
import { SalesRange } from "./sales-range";
import { SalesTabs, type SaleRow, type PaymentRow } from "./sales-tabs";
import { SalesBarChart } from "../raporlar/charts";

export const metadata = { title: "Satışlar" };

const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function rangeStart(range: string, now: Date): Date {
  switch (range) {
    case "bugun": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "3ay": return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "1yil": return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    default: return new Date(now.getFullYear(), now.getMonth(), 1); // buay
  }
}

export default async function SatislarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "buay" } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const start = rangeStart(range, now);

  const [paymentsRes, packagesRes, apptRes, customersRes] = await Promise.all([
    supabase.from("payments").select("*, customer:customers(full_name)").order("created_at", { ascending: false }),
    supabase.from("packages").select("id, customer_id, service_name, price, paid_amount, payment_status, purchased_at, created_at, customer:customers(full_name)"),
    supabase.from("appointments").select("id, customer_id, price, starts_at, service:services(name), customer:customers(full_name)").eq("status", "completed").is("package_id", null).not("price", "is", null),
    supabase.from("customers").select("id, full_name").eq("is_lead", false).order("full_name"),
  ]);

  // Tahsilatlar
  const paymentsRaw = (paymentsRes.data ?? []) as unknown as {
    id: string; created_at: string; amount: number | null; method: string; related_type: string | null; note: string | null;
    customer: { full_name: string } | { full_name: string }[] | null;
  }[];
  const payments: PaymentRow[] = paymentsRaw.map((p) => ({
    id: p.id, created_at: p.created_at, customer: pickOne(p.customer)?.full_name ?? "—",
    amount: p.amount, method: p.method, related_type: p.related_type, note: p.note,
  }));

  // Satışlar — paketler
  const pkgs = (packagesRes.data ?? []) as {
    id: string; customer_id: string | null; service_name: string | null; price: number | null; paid_amount: number | null;
    payment_status: string | null; purchased_at: string | null; created_at: string;
    customer: { full_name: string } | { full_name: string }[] | null;
  }[];
  const packageSales: SaleRow[] = pkgs
    .filter((p) => p.price != null && p.price > 0)
    .map((p) => ({
      id: `pkg-${p.id}`,
      date: p.purchased_at ?? p.created_at,
      customerId: p.customer_id,
      customer: pickOne(p.customer)?.full_name ?? "—",
      item: p.service_name ?? "Paket",
      amount: p.price ?? 0,
      kind: "Paket" as const,
      status: p.payment_status,
      packageId: p.id,
      remaining: Math.max((p.price ?? 0) - (p.paid_amount ?? 0), 0),
    }));

  // Satışlar — pakete bağlı olmayan tamamlanmış hizmetler
  const appts = (apptRes.data ?? []) as {
    id: string; customer_id: string | null; price: number | null; starts_at: string;
    service: { name: string } | { name: string }[] | null;
    customer: { full_name: string } | { full_name: string }[] | null;
  }[];
  const serviceSales: SaleRow[] = appts.map((a) => ({
    id: `appt-${a.id}`,
    date: a.starts_at,
    customerId: a.customer_id,
    customer: pickOne(a.customer)?.full_name ?? "—",
    item: pickOne(a.service)?.name ?? "Hizmet",
    amount: a.price ?? 0,
    kind: "Hizmet" as const,
    status: null,
    packageId: null,
    remaining: 0,
  }));

  const sales = [...packageSales, ...serviceSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Dönem KPI'ları
  const inPeriod = (d: string) => new Date(d).getTime() >= start.getTime();
  const periodSales = sales.filter((s) => inPeriod(s.date));
  const periodSalesTotal = periodSales.reduce((s, x) => s + x.amount, 0);
  const periodCount = periodSales.length;
  const avgSale = periodCount > 0 ? periodSalesTotal / periodCount : 0;
  const periodCollected = paymentsRaw.reduce((s, p) => (inPeriod(p.created_at) ? s + (p.amount ?? 0) : s), 0);
  const openReceivable = packageSales.reduce((s, x) => s + x.remaining, 0);
  const pendingCount = packageSales.filter((x) => x.remaining > 0).length;

  // 6 aylık satış trendi
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()], value: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const s of sales) {
    const d = new Date(s.date);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].value += s.amount;
  }
  const trendData = buckets.map(({ label, value }) => ({ label, value }));

  const customers = customersRes.data ?? [];
  const packagesForForm = pkgs.map((p) => ({ id: p.id, customer_id: p.customer_id, service_name: p.service_name }));

  const kpis = [
    { label: "Toplam Satış (Ciro)", value: formatPrice(periodSalesTotal), icon: ShoppingBag, tone: "bg-primary/10 text-primary", bar: "border-l-primary", accent: "" },
    { label: "İşlem Sayısı", value: String(periodCount), icon: ListChecks, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", accent: "" },
    { label: "Ort. Satış", value: formatPrice(avgSale), icon: Coins, tone: "bg-primary/10 text-primary", bar: "border-l-primary", accent: "" },
    { label: "Tahsilat", value: formatPrice(periodCollected), icon: Banknote, tone: "bg-positive/10 text-positive", bar: "border-l-positive", accent: "text-positive" },
    { label: "Kalan Alacak", value: formatPrice(openReceivable), icon: Scale, tone: "bg-danger/10 text-danger", bar: "border-l-danger", accent: openReceivable > 0 ? "text-danger" : "" },
    { label: "Ödeme Bekleyen", value: String(pendingCount), icon: Hourglass, tone: "bg-danger/10 text-danger", bar: "border-l-danger", accent: "", sub: "paket satışı" },
  ];

  const empty = sales.length === 0 && payments.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Satışlar"
        description="Yapılan satışlar (ciro), tahsilatlar ve bekleyen alacaklar tek ekranda."
      >
        <NewPaymentButton customers={customers} packages={packagesForForm} />
      </PageHeader>

      {empty ? (
        <EmptyState
          icon={ShoppingBag}
          title="Henüz satış veya tahsilat yok"
          description="Paket sat, fiyatlı randevu tamamla ya da “Ödeme al” ile tahsilat gir; satış cironu ve nakit akışını burada gör."
          action={customers.length > 0 ? <NewPaymentButton customers={customers} packages={packagesForForm} /> : undefined}
        />
      ) : (
        <>
          {/* Dönem seçici */}
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="size-5 text-primary" /> Satış İstatistikleri
            </h2>
            <SalesRange />
          </div>

          {/* 6 KPI */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {kpis.map((c) => {
              return (
                <div key={c.label} className="surface p-4">
                  <p className="section-label">{c.label}</p>
                  <p className={cn("mt-2 text-xl font-semibold tabular-nums tracking-tight", c.accent)}>{c.value}</p>
                  {c.sub && <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* Satış trendi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" /> Aylık Satış Trendi
              </CardTitle>
              <CardDescription>Son 6 ayda yapılan satışların (ciro) seyri.</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesBarChart data={trendData} />
            </CardContent>
          </Card>

          <p className="rounded-lg border border-dashed bg-card px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Satışlar</strong> = ne sattın (ciro; tahsil edilmese de) ·{" "}
            <strong className="text-foreground">Tahsilatlar</strong> = eline geçen para · fark ={" "}
            <strong className="text-foreground">Kalan Alacak</strong>. Satır sonundaki{" "}
            <strong className="text-foreground">Tahsil Et</strong> ile ödenmemiş paket satışını anında tahsil edebilirsin.
          </p>

          <SalesTabs sales={sales} payments={payments} />
        </>
      )}
    </div>
  );
}
