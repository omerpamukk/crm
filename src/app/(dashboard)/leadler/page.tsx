import { createClient } from "@/lib/supabase/server";
import type { Customer, PipelineStage } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";

import { NewLeadButton } from "./new-lead-button";
import { LeadBoard } from "./lead-board";

export const metadata = { title: "Lead'ler" };

export default async function LeadlerPage() {
  const supabase = await createClient();

  const [stagesRes, leadsRes, staffRes] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("customers")
      .select("*")
      .eq("is_lead", true)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const stages = (stagesRes.data ?? []) as PipelineStage[];
  const leads = (leadsRes.data ?? []) as Customer[];
  const staff = (staffRes.data ?? []) as { id: string; full_name: string | null }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead'ler"
        description="Potansiyel müşterileri pipeline sütunları arasında sürükleyerek takip et."
      >
        <NewLeadButton />
      </PageHeader>

      <LeadBoard stages={stages} leads={leads} staff={staff} />
    </div>
  );
}
