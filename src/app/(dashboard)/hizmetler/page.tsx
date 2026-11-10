import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { can } from "@/lib/permissions";
import type { Service } from "@/types/database";

import { ServicesView } from "./services-view";

export const metadata = { title: "Hizmetler" };

export default async function HizmetlerPage() {
  await requireCapability("randevu_yonet");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <ServicesView services={[]} canManage={false} loadFailed />;

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  return (
    <ServicesView
      services={(data ?? []) as Service[]}
      canManage={can(role, "randevu_yonet")}
      loadFailed={Boolean(error)}
    />
  );
}
