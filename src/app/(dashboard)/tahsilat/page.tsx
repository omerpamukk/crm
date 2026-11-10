import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { fetchDebtors, summarizeBalances, type DebtSummary } from "@/lib/balances";

import { SalesView } from "./sales-view";
import type { PaymentRow, SaleRow } from "./types";

export const metadata = { title: "Satışlar" };

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type NameJoin = { full_name: string } | { full_name: string }[] | null;

export default async function SatislarPage() {
  await requireCapability("tahsilat");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  const noDebt: DebtSummary = { openDebt: 0, debtorCount: 0, overdueAmount: 0, overdueCount: 0 };
  if (!businessId) return <SalesView sales={[]} payments={[]} customers={[]} packages={[]} debt={noDebt} canPay={false} loadFailed />;

  const [paymentsRes, packagesRes, apptRes, customersRes, debtorsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, created_at, customer_id, amount, method, related_type, note, customer:customers(full_name)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
    supabase
      .from("packages")
      .select("id, customer_id, service_name, price, paid_amount, payment_status, purchased_at, created_at, customer:customers(full_name)")
      .eq("business_id", businessId),
    supabase
      .from("appointments")
      .select("id, customer_id, price, starts_at, service:services(name), customer:customers(full_name)")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .is("package_id", null)
      .not("price", "is", null),
    supabase.from("customers").select("id, full_name").eq("business_id", businessId).eq("is_lead", false).order("full_name"),
    fetchDebtors(supabase, businessId),
  ]);

  const loadFailed = Boolean(
    paymentsRes.error || packagesRes.error || apptRes.error || customersRes.error || debtorsRes.error
  );

  // Tahsilatlar
  const payments: PaymentRow[] = (
    (paymentsRes.data ?? []) as unknown as {
      id: string; created_at: string; customer_id: string | null; amount: number | null; method: string;
      related_type: string | null; note: string | null; customer: NameJoin;
    }[]
  ).map((p) => ({
    id: p.id,
    created_at: p.created_at,
    customerId: p.customer_id,
    customer: pickOne(p.customer)?.full_name ?? "—",
    amount: p.amount ?? 0,
    method: p.method,
    related_type: p.related_type,
    note: p.note,
  }));

  // Satışlar: paketler
  const pkgs = (packagesRes.data ?? []) as unknown as {
    id: string; customer_id: string | null; service_name: string | null; price: number | null; paid_amount: number | null;
    payment_status: string | null; purchased_at: string | null; created_at: string; customer: NameJoin;
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

  // Satışlar: pakete bağlı olmayan tamamlanmış hizmetler
  const appts = (apptRes.data ?? []) as unknown as {
    id: string; customer_id: string | null; price: number | null; starts_at: string;
    service: { name: string } | { name: string }[] | null; customer: NameJoin;
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

  const sales = [...packageSales, ...serviceSales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <SalesView
      sales={sales}
      payments={payments}
      customers={customersRes.data ?? []}
      packages={pkgs.map((p) => ({ id: p.id, customer_id: p.customer_id, service_name: p.service_name }))}
      debt={summarizeBalances(debtorsRes.rows)}
      canPay={can(role, "tahsilat")}
      loadFailed={loadFailed}
    />
  );
}
