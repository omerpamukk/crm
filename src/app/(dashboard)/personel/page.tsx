import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { can } from "@/lib/permissions";
import type { Staff } from "@/types/database";

import { StaffView, type ServiceOption } from "./staff-view";

export const metadata = { title: "Personel" };

export default async function PersonelPage() {
  // Komisyon oranları hassas veri: yalnızca işletme sahibi.
  await requireCapability("personel_yonet");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <StaffView staff={[]} services={[]} staffServices={{}} canManage={false} loadFailed />;

  const [staffRes, servicesRes, linksRes] = await Promise.all([
    supabase
      .from("staff")
      .select("*")
      .eq("business_id", businessId)
      .order("is_active", { ascending: false })
      .order("full_name"),
    supabase.from("services").select("id, name").eq("business_id", businessId).order("name"),
    // 0042 çalışmadıysa tablo yoktur: herkes "Tüm hizmetler" sayılır.
    supabase.from("staff_services").select("staff_id, service_id").eq("business_id", businessId),
  ]);

  const staffServices: Record<string, string[]> = {};
  for (const r of (linksRes.error ? [] : linksRes.data ?? []) as { staff_id: string; service_id: string }[]) {
    (staffServices[r.staff_id] ??= []).push(r.service_id);
  }

  return (
    <StaffView
      staff={(staffRes.data ?? []) as Staff[]}
      services={(servicesRes.data ?? []) as ServiceOption[]}
      staffServices={staffServices}
      canManage={can(role, "personel_yonet")}
      loadFailed={Boolean(staffRes.error)}
    />
  );
}
