import { Scale, TrendingDown, Banknote, Wallet, AlarmClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CariView, type CariRow } from "./cari-view";

const DAY = 86_400_000;

export default async function CariPage() {
  const supabase = await createClient();
  const now = new Date().getTime();

  const [customersRes, packagesRes, apptRes, paymentsRes] = await Promise.all([
    supabase.from("customers").select("id, full_name, phone").eq("is_lead", false).order("full_name"),
    supabase.from("packages").select("customer_id, price, paid_amount, purchased_at"),
    supabase.from("appointments").select("customer_id, price, package_id").eq("status", "completed").not("price", "is", null),
    supabase.from("payments").select("customer_id, amount, created_at"),
  ]);

  const customers = (customersRes.data ?? []) as { id: string; full_name: string; phone: string | null }[];

  const charges = new Map<string, number>();
  const payments = new Map<string, number>();
  const lastPayment = new Map<string, string>();
  const overdueSet = new Set<string>();

  const addCharge = (id: string | null, amount: number) => {
    if (!id || !amount) return;
    charges.set(id, (charges.get(id) ?? 0) + amount);
  };

  for (const p of (packagesRes.data ?? []) as {
    customer_id: string | null; price: number | null; paid_amount: number | null; purchased_at: string | null;
  }[]) {
    addCharge(p.customer_id, p.price ?? 0);
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (p.customer_id && debt > 0 && p.purchased_at && now - new Date(p.purchased_at).getTime() > 30 * DAY) {
      overdueSet.add(p.customer_id);
    }
  }

  for (const a of (apptRes.data ?? []) as {
    customer_id: string | null; price: number | null; package_id: string | null;
  }[]) {
    if (a.package_id) continue;
    addCharge(a.customer_id, a.price ?? 0);
  }

  for (const pay of (paymentsRes.data ?? []) as {
    customer_id: string | null; amount: number | null; created_at: string;
  }[]) {
    if (!pay.customer_id) continue;
    payments.set(pay.customer_id, (payments.get(pay.customer_id) ?? 0) + (pay.amount ?? 0));
    const prev = lastPayment.get(pay.customer_id);
    if (!prev || pay.created_at > prev) lastPayment.set(pay.customer_id, pay.created_at);
  }

  const rows: CariRow[] = customers
    .map((c) => {
      const ch = charges.get(c.id) ?? 0;
      const pa = payments.get(c.id) ?? 0;
      const balance = ch - pa;
      return {
        id: c.id, name: c.full_name, phone: c.phone,
        charges: ch, payments: pa, balance,
        lastPaymentAt: lastPayment.get(c.id) ?? null,
        overdue: balance > 0 && overdueSet.has(c.id),
      };
    })
    .filter((r) => r.charges !== 0 || r.payments !== 0)
    .sort((a, b) => b.balance - a.balance);

  const totalCharges = rows.reduce((s, r) => s + r.charges, 0);
  const totalPayments = rows.reduce((s, r) => s + r.payments, 0);
  const totalReceivable = rows.reduce((s, r) => (r.balance > 0 ? s + r.balance : s), 0);
  const overdueAmount = rows.reduce((s, r) => (r.overdue ? s + r.balance : s), 0);
  const overdueCount = rows.filter((r) => r.overdue).length;
  const debtorCount = rows.filter((r) => r.balance > 0).length;

  const cards = [
    { label: "Toplam Borçlandırma", value: formatPrice(totalCharges), icon: TrendingDown, bar: "border-l-primary", tone: "bg-primary/10 text-primary", accent: "" },
    { label: "Toplam Tahsilat", value: formatPrice(totalPayments), icon: Banknote, bar: "border-l-positive", tone: "bg-positive/10 text-positive", accent: "text-positive" },
    { label: "Toplam Alacak", value: formatPrice(totalReceivable), icon: Wallet, bar: "border-l-danger", tone: "bg-danger/10 text-danger", accent: "text-danger", sub: `${debtorCount} borçlu müşteri` },
    { label: "Gecikmiş", value: formatPrice(overdueAmount), icon: AlarmClock, bar: "border-l-danger", tone: "bg-danger/10 text-danger", accent: "text-danger", sub: `${overdueCount} müşteri · 30 gün+` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cari Hesap"
        description="Her müşterinin satış, tahsilat, alacak ve ödeme takibi tek ekranda."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Henüz cari hareket yok"
          description="Paket sattıkça, randevu tamamlandıkça ve tahsilat girdikçe müşterilerin bakiyeleri burada otomatik hesaplanacak."
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
                    {c.sub && <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <CariView rows={rows} />
        </>
      )}
    </div>
  );
}
