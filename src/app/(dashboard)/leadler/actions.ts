"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { logInteraction } from "@/lib/supabase/interactions";

type ActionResult = { error?: string };

/** Lead'i başka bir pipeline sütununa taşır + zaman çizelgesine kaydeder. */
export async function moveLeadToStage(
  customerId: string,
  stageId: string,
  fromStageName: string,
  toStageName: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("customers")
    .update({ pipeline_stage_id: stageId })
    .eq("id", customerId);
  if (error) return { error: `Taşınamadı: ${error.message}` };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logInteraction(supabase, {
    businessId,
    customerId,
    type: "asama_degisikligi",
    note: `"${fromStageName}" aşamasından "${toStageName}" aşamasına taşındı`,
    createdBy: user?.id ?? null,
  });

  revalidatePath("/leadler");
  return {};
}

export async function createStage(name: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { data: maxRow } = await supabase
    .from("pipeline_stages")
    .select("position")
    .eq("business_id", businessId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = (maxRow?.position ?? -1) + 1;

  const { error } = await supabase.from("pipeline_stages").insert({
    business_id: businessId,
    name: name.trim() || "Yeni Sütun",
    color: "#64748B",
    position: nextPos,
  });
  if (error) return { error: `Sütun eklenemedi: ${error.message}` };

  revalidatePath("/leadler");
  return {};
}

export async function renameStage(
  id: string,
  name: string
): Promise<ActionResult> {
  if (!name.trim()) return { error: "Sütun adı boş olamaz." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { error: `Yeniden adlandırılamadı: ${error.message}` };
  revalidatePath("/leadler");
  return {};
}

export async function updateStageColor(
  id: string,
  color: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ color })
    .eq("id", id);
  if (error) return { error: `Renk güncellenemedi: ${error.message}` };
  revalidatePath("/leadler");
  return {};
}

/** Sütunu siler; içindeki kartlar reassignToId sütununa taşınır. */
export async function deleteStage(
  id: string,
  reassignToId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  if (reassignToId) {
    const { error: moveErr } = await supabase
      .from("customers")
      .update({ pipeline_stage_id: reassignToId })
      .eq("pipeline_stage_id", id);
    if (moveErr) return { error: `Kartlar taşınamadı: ${moveErr.message}` };
  }

  const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
  if (error) return { error: `Sütun silinemedi: ${error.message}` };

  revalidatePath("/leadler");
  return {};
}

export async function reorderStages(orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) return { error: `Sıralama güncellenemedi: ${error.message}` };
  }
  revalidatePath("/leadler");
  return {};
}

export async function convertLeadToCustomer(
  customerId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("customers")
    .update({ is_lead: false, pipeline_stage_id: null, status: "active" })
    .eq("id", customerId);
  if (error) return { error: `Dönüştürülemedi: ${error.message}` };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logInteraction(supabase, {
    businessId,
    customerId,
    type: "not",
    note: "Müşteriye dönüştürüldü",
    createdBy: user?.id ?? null,
  });

  revalidatePath("/leadler");
  revalidatePath("/musteriler");
  return {};
}
