import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { getBusinessId } from "@/lib/supabase/business";
import { fetchDebtors, isOverdue, summarizeBalances } from "@/lib/balances";
import { SLOT_HOLDING_STATUSES } from "@/lib/appointment-status";
import { zonedParts, zonedWallToUtcMs } from "@/lib/zaman";
import type { Customer } from "@/types/database";

import { CustomersView } from "./customers-view";
import {
  type EnrichedCustomer,
  type NextAppt,
  type PackageOption,
  type ServiceOption,
  type StaffOption,
} from "./customer-types";

export const metadata = { title: "Müşteriler" };

/**
 * Tek seferde çekilen müşteri üst sınırı. Filtreleme istemcide yapıldığı
 * için veri tek turda gelir; sınır çok büyük hesaplarda sayfanın çökmesini
 * engeller, aşılırsa kullanıcıya söylenir.
 */
const CUSTOMER_LIMIT = 2000;

type PkgRow = {
  id: string;
  customer_id: string | null;
  service_name: string | null;
  total_sessions: number | null;
  remaining_sessions: number | null;
  purchased_at: string | null;
  price: number | null;
  paid_amount: number | null;
};

type ApptRow = {
  id: string;
  customer_id: string | null;
  starts_at: string;
  status: string;
  arrived_at: string | null;
  service: { name: string } | { name: string }[] | null;
  staff_member: { full_name: string } | { full_name: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function MusterilerPage() {
  const { role } = await getAccountContext();
  const abilities = {
    add: can(role, "musteri_ekle"),
    manage: can(role, "musteri_yonet"),
    book: can(role, "randevu_yonet"),
    pay: can(role, "tahsilat"),
  };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  const now = new Date();
  // Gün ve ay sınırları İstanbul saatine göre (sunucu UTC'de çalışır).
  const tr = zonedParts(now.getTime());
  const startOfMonth = new Date(zonedWallToUtcMs(tr.y, tr.m, 1, 0, 0));
  const startOfToday = new Date(zonedWallToUtcMs(tr.y, tr.m, tr.d, 0, 0));

  const [
    customersRes,
    packagesRes,
    paymentsRes,
    interactionsRes,
    apptRes,
    servicesRes,
    staffRes,
    monthSessionsRes,
    newThisMonthRes,
    debtRes,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("is_lead", false)
      .order("created_at", { ascending: false })
      .limit(CUSTOMER_LIMIT),
    supabase
      .from("packages")
      .select("id, customer_id, service_name, total_sessions, remaining_sessions, purchased_at, price, paid_amount")
      .limit(5000),
    supabase.from("payments").select("customer_id, amount").limit(10000),
    supabase
      .from("interactions")
      .select("customer_id, created_at, type")
      .order("created_at", { ascending: false })
      .limit(5000),
    // Bugünden itibaren planlı ya da gelmiş randevular: bugün gelmiş müşteri de görünür.
    supabase
      .from("appointments")
      .select("id, customer_id, starts_at, status, arrived_at, service:services(name), staff_member:staff(full_name)")
      .gte("starts_at", startOfToday.toISOString())
      .in("status", [...SLOT_HOLDING_STATUSES])
      .order("starts_at", { ascending: true })
      .limit(5000),
    supabase.from("services").select("id, name, price").order("name"),
    supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("starts_at", startOfMonth.toISOString()),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_lead", false)
      .gte("created_at", startOfMonth.toISOString()),
    businessId ? fetchDebtors(supabase, businessId) : Promise.resolve({ rows: [], error: false }),
  ]);

  const loadFailed = Boolean(customersRes.error);
  const customers = (customersRes.data ?? []) as Customer[];
  const packages = (packagesRes.data ?? []) as PkgRow[];

  // Müşteri başına aktif paket (seansı kalan, en yeni); yoksa en yeni paket.
  const pkgByCustomer = new Map<string, { service: string | null; remaining: number | null; total: number | null }>();
  for (const p of packages) {
    if (!p.customer_id) continue;
    const cur = pkgByCustomer.get(p.customer_id);
    const hasSessions = (p.remaining_sessions ?? 0) > 0;
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

  // Açık borç ve gecikme: tek kaynak (customer_balances, 0031; src/lib/balances.ts).
  const debtByCustomer = new Map(debtRes.rows.map((b) => [b.customer_id, { debt: b.balance, overdue: isOverdue(b) }]));
  const debtSummary = summarizeBalances(debtRes.rows);

  // interactions desc sıralı: ilk görülen = en son
  const lastContactByCustomer = new Map<string, { at: string; type: string }>();
  for (const it of (interactionsRes.data ?? []) as { customer_id: string | null; created_at: string; type: string }[]) {
    if (!it.customer_id || lastContactByCustomer.has(it.customer_id)) continue;
    lastContactByCustomer.set(it.customer_id, { at: it.created_at, type: it.type });
  }

  // randevular artan sıralı: ilk görülen = sıradaki
  const nextApptByCustomer = new Map<string, NextAppt>();
  for (const a of (apptRes.data ?? []) as unknown as ApptRow[]) {
    if (!a.customer_id || nextApptByCustomer.has(a.customer_id)) continue;
    nextApptByCustomer.set(a.customer_id, {
      id: a.id,
      startsAt: a.starts_at,
      status: a.status,
      arrivedAt: a.arrived_at,
      serviceName: one(a.service)?.name ?? null,
      staffName: one(a.staff_member)?.full_name ?? null,
    });
  }

  const enriched: EnrichedCustomer[] = customers.map((c) => {
    const pkg = pkgByCustomer.get(c.id);
    const lc = lastContactByCustomer.get(c.id);
    const debt = debtByCustomer.get(c.id);
    return {
      ...c,
      service: pkg?.service ?? null,
      remaining: pkg?.remaining ?? null,
      total: pkg?.total ?? null,
      totalValue: valueByCustomer.get(c.id) ?? 0,
      openDebt: debt?.debt ?? 0,
      overdue: debt?.overdue ?? false,
      lastContactAt: lc?.at ?? c.last_visit_at ?? null,
      lastContactType: lc?.type ?? null,
      nextAppt: nextApptByCustomer.get(c.id) ?? null,
    };
  });

  const activeCount = enriched.filter((c) => c.status !== "passive" && c.status !== "archived").length;

  const metrics = {
    active: activeCount,
    monthSessions: monthSessionsRes.count ?? 0,
    newThisMonth: newThisMonthRes.count ?? 0,
    openDebt: debtSummary.openDebt,
    debtorCount: debtSummary.debtorCount,
    overdueCount: debtSummary.overdueCount,
  };

  const allTags = [...new Set(customers.flatMap((c) => c.tags ?? []))].sort((a, b) => a.localeCompare(b, "tr"));
  const serviceNames = [...new Set(((servicesRes.data ?? []) as ServiceOption[]).map((s) => s.name).filter(Boolean))];
  const packageOptions: PackageOption[] = packages.map((p) => ({
    id: p.id,
    customer_id: p.customer_id,
    service_name: p.service_name,
    remaining_sessions: p.remaining_sessions,
  }));

  return (
    <CustomersView
      customers={enriched}
      metrics={metrics}
      services={(servicesRes.data ?? []) as ServiceOption[]}
      serviceNames={serviceNames}
      staff={(staffRes.data ?? []) as StaffOption[]}
      packages={packageOptions}
      tags={allTags}
      abilities={abilities}
      canArrive={abilities.book}
      limited={customers.length >= CUSTOMER_LIMIT}
      limit={CUSTOMER_LIMIT}
      loadFailed={loadFailed}
    />
  );
}
