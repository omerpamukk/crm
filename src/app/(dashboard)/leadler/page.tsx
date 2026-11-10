import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/supabase/guard";
import type { Customer, PipelineStage } from "@/types/database";

import { LeadsView } from "./leads-view";

export const metadata = { title: "Lead'ler" };

export default async function LeadlerPage() {
  await requireCapability("musteri_yonet");
  const supabase = await createClient();

  const [stagesRes, leadsRes, staffRes] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("position", { ascending: true }),
    supabase
      .from("customers")
      .select("*")
      .eq("is_lead", true)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const loadFailed = Boolean(stagesRes.error || leadsRes.error);
  if (loadFailed) console.error("leadler:", stagesRes.error ?? leadsRes.error);

  return (
    <LeadsView
      stages={(stagesRes.data ?? []) as PipelineStage[]}
      leads={(leadsRes.data ?? []) as Customer[]}
      staff={(staffRes.data ?? []) as { id: string; full_name: string | null }[]}
      loadFailed={loadFailed}
    />
  );
}
