import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { can } from "@/lib/permissions";
import type { Staff } from "@/types/database";

import { StaffView } from "./staff-view";

export const metadata = { title: "Personel" };

export default async function PersonelPage() {
  // Komisyon oranları hassas veri: yalnızca işletme sahibi.
  await requireCapability("personel_yonet");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <StaffView staff={[]} canManage={false} loadFailed />;

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("business_id", businessId)
    .order("is_active", { ascending: false })
    .order("full_name");

  return (
    <StaffView
      staff={(data ?? []) as Staff[]}
      canManage={can(role, "personel_yonet")}
      loadFailed={Boolean(error)}
    />
  );
}
