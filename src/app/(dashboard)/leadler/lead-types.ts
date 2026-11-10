import type { Customer, PipelineStage } from "@/types/database";

export type Staff = { id: string; full_name: string | null };

/** Lead'in görünen aşaması: aşaması boşsa ilk aşamada sayılır. */
export function stageIdOf(lead: Customer, stages: PipelineStage[]): string | null {
  return lead.pipeline_stage_id ?? stages[0]?.id ?? null;
}

export function matchesQuery(lead: Customer, q: string): boolean {
  const needle = q.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return true;
  return [lead.full_name, lead.phone, lead.email, lead.source]
    .filter(Boolean)
    .some((v) => String(v).toLocaleLowerCase("tr-TR").includes(needle));
}
