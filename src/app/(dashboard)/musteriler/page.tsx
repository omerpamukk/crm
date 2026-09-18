import { Users, TrendingUp, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import type { Customer } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CardTitle } from "@/components/ui/card";

import { NewCustomerButton } from "./new-customer-button";
import { CustomersView, type EnrichedCustomer } from "./customers-view";

export default async function MusterilerPage() {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customersRes,
    packagesRes,
    paymentsRes,
    interactionsRes,
    apptRes,
    servicesRes,
    monthSessionsRes,
    newThisMonthRes,
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("is_lead", false).order("created_at", { ascending: false }),
    supabase.from("packages").select("customer_id, service_name, total_sessions, remaining_sessions, purchased_at, price, paid_amount"),
    supabase.from("payments").select("customer_id, amount"),
    supabase.from("interactions").select("customer_id, created_at, type").order("created_at", { ascending: false }),
    supabase.from("appointments").select("customer_id, starts_at").gte("starts_at", now.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("services").select("name").order("name"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "completed").gte("starts_at", startOfMonth.toISOString()),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_lead", false).gte("created_at", startOfMonth.toISOString()),
  ]);

  const customers = (customersRes.data ?? []) as Customer[];

  // Müşteri başına aktif paket (seansı kalan, en yeni); yoksa en yeni paket.
  const pkgByCustomer = new Map<string, { service: string | null; remaining: number | null; total: number | null }>();
  for (const p of (packagesRes.data ?? []) as {
    customer_id: string | null;
    service_name: string | null;
    total_sessions: number | null;
    remaining_sessions: number | null;
    purchased_at: string | null;
  }[]) {
    if (!p.customer_id) continue;
    const cur = pkgByCustomer.get(p.customer_id);
    const hasSessions = (p.remaining_sessions ?? 0) > 0;
    // Seansı kalan paketi önceliklendir
    if (!cur || (hasSessions && (cur.remaining ?? 0) <= 0)) {
      pkgByCustomer.set(p.customer_id, {
        service: p.service_name,
        remaining: p.remaining_sessions,
        total: p.total_sessions,
      });
    }
  }

  const valueByCustomer = new Map<string, number>();
  for (const p of (paymentsRes.data ?? []) as { customer_id: string | null; amount: number | null }[]) {
    if (!p.customer_id) continue;
    valueByCustomer.set(p.customer_id, (valueByCustomer.get(p.customer_id) ?? 0) + (p.amount ?? 0));
  }

  // Müşteri başına açık borç (paketlerdeki fiyat - ödenen)
  const debtByCustomer = new Map<string, number>();
  for (const p of (packagesRes.data ?? []) as { customer_id: string | null; price: number | null; paid_amount: number | null }[]) {
    if (!p.customer_id) continue;
    const debt = (p.price ?? 0) - (p.paid_amount ?? 0);
    if (debt > 0) debtByCustomer.set(p.customer_id, (debtByCustomer.get(p.customer_id) ?? 0) + debt);
  }

  // interactions desc sıralı → ilk görülen = en son
  const lastContactByCustomer = new Map<string, { at: string; type: string }>();
  for (const it of (interactionsRes.data ?? []) as { customer_id: string | null; created_at: string; type: string }[]) {
    if (!it.customer_id || lastContactByCustomer.has(it.customer_id)) continue;
    lastContactByCustomer.set(it.customer_id, { at: it.created_at, type: it.type });
  }

  // upcoming appts asc → ilk = sıradaki
  const nextApptByCustomer = new Map<string, string>();
  for (const a of (apptRes.data ?? []) as { customer_id: string | null; starts_at: string }[]) {
    if (!a.customer_id || nextApptByCustomer.has(a.customer_id)) continue;
    nextApptByCustomer.set(a.customer_id, a.starts_at);
  }

  const enriched: EnrichedCustomer[] = customers.map((c) => {
    const pkg = pkgByCustomer.get(c.id);
    const lc = lastContactByCustomer.get(c.id);
    return {
      ...c,
      service: pkg?.service ?? null,
      remaining: pkg?.remaining ?? null,
      total: pkg?.total ?? null,
      totalValue: valueByCustomer.get(c.id) ?? 0,
      openDebt: debtByCustomer.get(c.id) ?? 0,
      lastContactAt: lc?.at ?? c.last_visit_at ?? null,
      lastContactType: lc?.type ?? null,
      nextApptAt: nextApptByCustomer.get(c.id) ?? null,
    };
  });

  const serviceNames = [
    ...new Set(
      ((servicesRes.data ?? []) as { name: string }[]).map((s) => s.name).filter(Boolean)
    ),
  ];
  const allTags = [...new Set(customers.flatMap((c) => c.tags ?? []))];

  const activeCount = enriched.filter((c) => c.status !== "passive" && c.status !== "archived").length;
  const monthSessions = monthSessionsRes.count ?? 0;
  const newThisMonth = newThisMonthRes.count ?? 0;
  const totalOpenDebt = enriched.reduce((s, c) => s + c.openDebt, 0);
  const debtorCount = enriched.filter((c) => c.openDebt > 0).length;

  const kpis = [
    { label: "Aktif Müşteri", value: activeCount.toLocaleString("tr-TR"), trend: newThisMonth > 0 ? `+${newThisMonth} bu ay` : null, sub: null as string | null, accent: "" },
    { label: "Bu Ay Seans", value: monthSessions.toLocaleString("tr-TR"), trend: null, sub: null as string | null, accent: "" },
    { label: "Bu Ay Yeni Müşteri", value: `+${newThisMonth}`, trend: null, sub: null as string | null, accent: "" },
    { label: "Açık Alacak", value: formatPrice(totalOpenDebt), trend: null, sub: debtorCount > 0 ? `${debtorCount} borçlu müşteri` : null, accent: totalOpenDebt > 0 ? "text-danger" : "" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Müşteriler"
        description="Dönüşmüş müşterilerini yönet, filtrele ve geçmişlerini takip et."
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Henüz müşteri yok"
          description="Lead'ler “Müşteriye dönüştür” ile buraya gelir; ya da doğrudan yeni müşteri ekleyebilirsin."
          action={<NewCustomerButton />}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="surface p-5">
                <p className="section-label">{kpi.label}</p>
                <p className={`metric-value mt-2 ${kpi.accent}`}>{kpi.value}</p>
                {kpi.trend && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-positive">
                    <TrendingUp className="size-3" />
                    {kpi.trend}
                  </p>
                )}
                {kpi.sub && <p className="mt-1.5 text-xs text-muted-foreground">{kpi.sub}</p>}
              </div>
            ))}
          </div>

          <CustomersView customers={enriched} services={serviceNames} tags={allTags} />
        </>
      )}
    </div>
  );
}
