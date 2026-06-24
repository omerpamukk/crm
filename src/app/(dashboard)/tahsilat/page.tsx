import { ShoppingBag, Wallet, Banknote, Scale } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { NewPaymentButton } from "./new-payment-button";
import { SalesTabs, type SaleRow, type PaymentRow } from "./sales-tabs";

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function SatislarPage() {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [paymentsRes, packagesRes, apptRes, customersRes] = await Promise.all([
    supabase.from("payments").select("*, customer:customers(full_name)").order("created_at", { ascending: false }),
    supabase.from("packages").select("id, customer_id, service_name, price, payment_status, purchased_at, created_at, customer:customers(full_name)"),
    supabase.from("appointments").select("id, price, starts_at, service:services(name), customer:customers(full_name)").eq("status", "completed").is("package_id", null).not("price", "is", null),
    supabase.from("customers").select("id, full_name").eq("is_lead", false).order("full_name"),
  ]);

  // Tahsilatlar
  const paymentsRaw = (paymentsRes.data ?? []) as unknown as (PaymentRow & {
    customer: { full_name: string } | { full_name: string }[] | null;
  })[];
  const payments: PaymentRow[] = paymentsRaw.map((p) => ({
    id: p.id,
    created_at: p.created_at,
    customer: pickOne(p.customer)?.full_name ?? "—",
    amount: p.amount,
    method: p.method,
    related_type: p.related_type,
    note: p.note,
  }));

  // Satışlar — paketler
  const pkgs = (packagesRes.data ?? []) as {
    id: string; customer_id: string | null; service_name: string | null; price: number | null;
    payment_status: string | null; purchased_at: string | null; created_at: string;
    customer: { full_name: string } | { full_name: string }[] | null;
  }[];
  const packageSales: SaleRow[] = pkgs
    .filter((p) => p.price != null && p.price > 0)
    .map((p) => ({
      id: `pkg-${p.id}`,
      date: p.purchased_at ?? p.created_at,
      customer: pickOne(p.customer)?.full_name ?? "—",
      item: p.service_name ?? "Paket",
      amount: p.price ?? 0,
      kind: "Paket" as const,
      status: p.payment_status,
    }));

  // Satışlar — pakete bağlı olmayan tamamlanmış hizmetler
  const appts = (apptRes.data ?? []) as {
    id: string; price: number | null; starts_at: string;
    service: { name: string } | { name: string }[] | null;
    customer: { full_name: string } | { full_name: string }[] | null;
  }[];
  const serviceSales: SaleRow[] = appts.map((a) => ({
    id: `appt-${a.id}`,
    date: a.starts_at,
    customer: pickOne(a.customer)?.full_name ?? "—",
    item: pickOne(a.service)?.name ?? "Hizmet",
    amount: a.price ?? 0,
    kind: "Hizmet" as const,
    status: null,
  }));

  const sales = [...packageSales, ...serviceSales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Özet
  const totalSales = sales.reduce((s, x) => s + x.amount, 0);
  const totalCollected = payments.reduce((s, x) => s + (x.amount ?? 0), 0);
  const remaining = totalSales - totalCollected;
  const monthCollected = paymentsRaw.reduce(
    (s, p) => (new Date(p.created_at).getTime() >= startOfMonth.getTime() ? s + (p.amount ?? 0) : s),
    0
  );

  const customers = customersRes.data ?? [];
  const packagesForForm = pkgs.map((p) => ({ id: p.id, customer_id: p.customer_id, service_name: p.service_name }));

  const cards = [
    { label: "Toplam Satış (Ciro)", value: formatPrice(totalSales), icon: ShoppingBag, bar: "border-l-primary", tone: "bg-primary/10 text-primary", accent: "" },
    { label: "Toplam Tahsilat", value: formatPrice(totalCollected), icon: Banknote, bar: "border-l-positive", tone: "bg-positive/10 text-positive", accent: "text-positive" },
    { label: "Kalan Alacak", value: formatPrice(Math.max(remaining, 0)), icon: Scale, bar: "border-l-danger", tone: "bg-danger/10 text-danger", accent: remaining > 0 ? "text-danger" : "" },
    { label: "Bu Ay Tahsilat", value: formatPrice(monthCollected), icon: Wallet, bar: "border-l-positive", tone: "bg-positive/10 text-positive", accent: "" },
  ];

  const empty = sales.length === 0 && payments.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Satışlar"
        description="Yapılan satışlar (ciro) ve tahsil edilen ödemeler tek ekranda."
      >
        <NewPaymentButton customers={customers} packages={packagesForForm} />
      </PageHeader>

      {empty ? (
        <EmptyState
          icon={ShoppingBag}
          title="Henüz satış veya tahsilat yok"
          description="Paket sat, fiyatlı randevu tamamla ya da “Ödeme al” ile tahsilat gir; burada satış cirosu ve nakit akışın oluşacak."
          action={customers.length > 0 ? <NewPaymentButton customers={customers} packages={packagesForForm} /> : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label} className={cn("border-l-4", c.bar)}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                    <span className={cn("flex size-9 items-center justify-center rounded-lg", c.tone)}>
                      <Icon className="size-5" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-2xl font-bold", c.accent)}>{c.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="rounded-lg border border-dashed bg-card px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Satışlar</strong> = ne sattın (ciro; tahsil edilmese de) ·{" "}
            <strong className="text-foreground">Tahsilatlar</strong> = eline geçen para. Aradaki fark{" "}
            <strong className="text-foreground">Kalan Alacak</strong>.
          </p>

          <SalesTabs sales={sales} payments={payments} />
        </>
      )}
    </div>
  );
}
