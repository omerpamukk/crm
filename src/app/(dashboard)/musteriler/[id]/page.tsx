import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Customer, Package, Payment, Interaction } from "@/types/database";

import { Customer360View, type ApptItem } from "./customer-360-view";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const [apptRes, pkgRes, payRes, intRes, servicesRes, staffRes, assigneeRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, status, price, package_id, service:services(name, duration_min, price), staff_member:staff(full_name)")
      .eq("customer_id", id)
      .order("starts_at", { ascending: false }),
    supabase.from("packages").select("*").eq("customer_id", id).order("purchased_at", { ascending: false }),
    supabase.from("payments").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("interactions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("services").select("id, name, price").order("name"),
    supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
    (customer as Customer).assigned_to
      ? supabase.from("staff").select("full_name").eq("id", (customer as Customer).assigned_to as string).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const appointments = (apptRes.data ?? []) as unknown as ApptItem[];
  const packages = (pkgRes.data ?? []) as Package[];
  const payments = (payRes.data ?? []) as Payment[];
  const interactions = (intRes.data ?? []) as Interaction[];
  const services = (servicesRes.data ?? []) as { id: string; name: string; price: number | null }[];
  const staff = (staffRes.data ?? []) as { id: string; full_name: string }[];
  const assigneeName = (assigneeRes.data as { full_name: string } | null)?.full_name ?? null;

  return (
    <Customer360View
      customer={customer as Customer}
      appointments={appointments}
      packages={packages}
      payments={payments}
      interactions={interactions}
      services={services}
      staff={staff}
      assigneeName={assigneeName}
    />
  );
}
