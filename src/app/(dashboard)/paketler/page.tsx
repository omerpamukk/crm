import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { getBusinessId } from "@/lib/supabase/business";
import { fetchDebtors, summarizeBalances } from "@/lib/balances";
import { requireCapability, requireModule } from "@/lib/supabase/guard";

import { PackagesView, type PackageRow } from "./packages-view";

export const metadata = { title: "Paketler" };

export default async function PaketlerPage() {
  await requireCapability("tahsilat");
  await requireModule("paketler");
  const { role } = await getAccountContext();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <PackagesView packages={[]} customers={[]} canManage={false} loadFailed debt={summarizeBalances([])} />;

  const [packagesRes, customersRes, debtors] = await Promise.all([
    supabase.from("packages").select("*, customer:customers(full_name)").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("customers").select("id, full_name").eq("business_id", businessId).eq("is_lead", false).order("full_name"),
    fetchDebtors(supabase, businessId),
  ]);

  return (
    <PackagesView
      packages={(packagesRes.data ?? []) as unknown as PackageRow[]}
      customers={customersRes.data ?? []}
      canManage={can(role, "tahsilat")}
      loadFailed={Boolean(packagesRes.error || customersRes.error || debtors.error)}
      debt={summarizeBalances(debtors.rows)}
    />
  );
}
