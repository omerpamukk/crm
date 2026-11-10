import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { requireCapability } from "@/lib/supabase/guard";
import { getBusinessId } from "@/lib/supabase/business";
import { fetchCustomerBalances, isOverdue } from "@/lib/balances";
import { paymentMethodLabel } from "@/lib/constants";

import { CariView } from "./cari-view";
import type { CariRow, Movement } from "./cari-types";

export const metadata = { title: "Cari Hesap" };

const MOVEMENT_LIMIT = 30;
const RELATED_LABEL: Record<string, string> = { paket: "Paket", randevu: "Randevu" };

function pickOne<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function CariPage() {
  await requireCapability("tahsilat");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <CariView rows={[]} customers={[]} packages={[]} canPay={false} loadFailed />;

  const [customersRes, packagesRes, apptRes, paymentsRes, balances] = await Promise.all([
    supabase.from("customers").select("id, full_name, phone").eq("business_id", businessId).eq("is_lead", false).order("full_name"),
    supabase.from("packages").select("id, customer_id, service_name, price, paid_amount, purchased_at, created_at").eq("business_id", businessId),
    supabase
      .from("appointments")
      .select("id, customer_id, price, package_id, starts_at, service:services(name)")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .not("price", "is", null),
    supabase.from("payments").select("id, customer_id, amount, created_at, method, related_type").eq("business_id", businessId),
    fetchCustomerBalances(supabase, businessId),
  ]);

  const loadFailed = Boolean(customersRes.error || packagesRes.error || apptRes.error || paymentsRes.error || balances.error);
  const customers = (customersRes.data ?? []) as { id: string; full_name: string; phone: string | null }[];

  // Tutarlar (bakiye, gecikme) veritabanındaki tek kaynaktan gelir (customer_balances, 0031);
  // burada yalnızca hareket listesi kurulur.
  const balanceByCustomer = new Map(balances.rows.map((b) => [b.customer_id, b]));
  const movements = new Map<string, Movement[]>();

  const addMovement = (id: string | null, m: Movement) => {
    if (!id) return;
    const list = movements.get(id);
    if (list) list.push(m);
    else movements.set(id, [m]);
  };

  const pkgs = (packagesRes.data ?? []) as {
    id: string; customer_id: string | null; service_name: string | null; price: number | null;
    paid_amount: number | null; purchased_at: string | null; created_at: string;
  }[];
  for (const p of pkgs) {
    if (p.price) {
      addMovement(p.customer_id, {
        id: `pkg-${p.id}`,
        date: p.purchased_at ?? p.created_at,
        kind: "paket",
        title: p.service_name ?? "Paket",
        amount: p.price,
        detail: null,
      });
    }
  }

  for (const a of (apptRes.data ?? []) as unknown as {
    id: string; customer_id: string | null; price: number | null; package_id: string | null; starts_at: string;
    service: { name: string } | { name: string }[] | null;
  }[]) {
    if (a.package_id) continue;
    if (a.price) {
      addMovement(a.customer_id, {
        id: `appt-${a.id}`,
        date: a.starts_at,
        kind: "hizmet",
        title: pickOne(a.service)?.name ?? "Hizmet",
        amount: a.price,
        detail: null,
      });
    }
  }

  for (const pay of (paymentsRes.data ?? []) as {
    id: string; customer_id: string | null; amount: number | null; created_at: string; method: string | null; related_type: string | null;
  }[]) {
    if (!pay.customer_id) continue;
    addMovement(pay.customer_id, {
      id: `pay-${pay.id}`,
      date: pay.created_at,
      kind: "odeme",
      title: paymentMethodLabel(pay.method),
      amount: pay.amount ?? 0,
      detail: pay.related_type ? (RELATED_LABEL[pay.related_type] ?? null) : null,
    });
  }

  const rows: CariRow[] = customers
    .map((c) => {
      const b = balanceByCustomer.get(c.id);
      const list = (movements.get(c.id) ?? [])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MOVEMENT_LIMIT);
      return {
        id: c.id,
        name: c.full_name,
        phone: c.phone,
        charges: b?.charges ?? 0,
        payments: b?.payments ?? 0,
        balance: b?.balance ?? 0,
        lastPaymentAt: b?.last_payment_at ?? null,
        overdue: b ? isOverdue(b) : false,
        movements: list,
      };
    })
    .filter((r) => r.charges !== 0 || r.payments !== 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <CariView
      rows={rows}
      customers={customers.map((c) => ({ id: c.id, full_name: c.full_name }))}
      packages={pkgs.map((p) => ({ id: p.id, customer_id: p.customer_id, service_name: p.service_name }))}
      canPay={can(role, "tahsilat")}
      loadFailed={loadFailed}
    />
  );
}
