import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { getBusinessId } from "@/lib/supabase/business";
import { fetchCustomerBalances } from "@/lib/balances";
import type { Customer, Package, Payment, Interaction } from "@/types/database";

import { Customer360View, type ApptItem } from "./customer-360-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("full_name").eq("id", id).maybeSingle();
  return { title: (data as { full_name: string } | null)?.full_name ?? "Müşteri" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await getAccountContext();
  const abilities = {
    add: can(role, "musteri_ekle"),
    manage: can(role, "musteri_yonet"),
    book: can(role, "randevu_yonet"),
    pay: can(role, "tahsilat"),
  };
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) notFound();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!customer) notFound();

  const [apptRes, pkgRes, payRes, intRes, servicesRes, staffRes, assigneeRes, balanceRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, status, price, package_id, arrived_at, service:services(name, duration_min, price), staff_member:staff(full_name)")
      .eq("customer_id", id).eq("business_id", businessId)
      .order("starts_at", { ascending: false }),
    supabase.from("packages").select("*").eq("customer_id", id).eq("business_id", businessId).order("purchased_at", { ascending: false }),
    supabase.from("payments").select("*").eq("customer_id", id).eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("interactions").select("*").eq("customer_id", id).eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("services").select("id, name, price").order("name"),
    supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
    (customer as Customer).assigned_to
      ? supabase.from("staff").select("full_name").eq("id", (customer as Customer).assigned_to as string).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchCustomerBalances(supabase, businessId, { customerId: id }),
  ]);

  const loadFailed = [apptRes, pkgRes, payRes, intRes].some((r) => r.error);

  return (
    <Customer360View
      customer={customer as Customer}
      appointments={(apptRes.data ?? []) as unknown as ApptItem[]}
      packages={(pkgRes.data ?? []) as Package[]}
      payments={(payRes.data ?? []) as Payment[]}
      interactions={(intRes.data ?? []) as Interaction[]}
      services={(servicesRes.data ?? []) as { id: string; name: string; price: number | null }[]}
      staff={(staffRes.data ?? []) as { id: string; full_name: string }[]}
      assigneeName={(assigneeRes.data as { full_name: string } | null)?.full_name ?? null}
      abilities={abilities}
      canArrive={abilities.book}
      loadFailed={loadFailed || balanceRes.error}
      balance={balanceRes.rows[0]?.balance ?? 0}
    />
  );
}
