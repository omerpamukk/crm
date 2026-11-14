import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { attachServiceIds } from "@/lib/staff-services";

import { AppointmentsView } from "./appointments-view";
import type { AppointmentRow } from "./types";

export const metadata = { title: "Randevular" };

export default async function RandevularPage() {
  const supabase = await createClient();
  const { role, userId } = await getAccountContext();

  // Uzman yalnızca kendi randevularını görür (tüm randevular yetkisi yoksa).
  const { data: profile } = await supabase
    .from("profiles")
    .select("staff_id")
    .eq("id", userId)
    .maybeSingle();
  const staffId = (profile as { staff_id: string | null } | null)?.staff_id ?? null;
  const onlyOwn = !can(role, "tum_randevular");

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      "*, customer:customers(full_name, phone), service:services(name, duration_min), staff_member:staff(full_name)"
    )
    .order("starts_at", { ascending: true });
  if (onlyOwn) {
    // Bağlı personel kaydı yoksa hiçbir randevu eşleşmez.
    appointmentsQuery = appointmentsQuery.eq(
      "staff_member_id",
      staffId ?? "00000000-0000-0000-0000-000000000000"
    );
  }

  const [appointmentsRes, customersRes, servicesRes, staffRes, packagesRes] = await Promise.all([
    appointmentsQuery,
    supabase.from("customers").select("id, full_name").order("full_name"),
    supabase.from("services").select("id, name, price").order("name"),
    supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("packages").select("id, customer_id, service_name, remaining_sessions"),
  ]);

  const staffOptions = await attachServiceIds(supabase, (staffRes.data ?? []) as { id: string; full_name: string }[]);

  return (
    <AppointmentsView
      appointments={(appointmentsRes.data ?? []) as unknown as AppointmentRow[]}
      customers={customersRes.data ?? []}
      services={servicesRes.data ?? []}
      staff={staffOptions}
      packages={packagesRes.data ?? []}
      loadFailed={Boolean(appointmentsRes.error)}
      role={role}
      profileStaffId={staffId}
    />
  );
}
