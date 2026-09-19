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
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("renameStage:", error);
    return { error: "Yeniden adlandırılamadı." };
  }
  revalidatePath("/leadler");
  return {};
}

export async function updateStageColor(
  id: string,
  color: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ color })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("updateStageColor:", error);
    return { error: "Renk güncellenemedi." };
  }
  revalidatePath("/leadler");
  return {};
}

/** Sütunu siler; içindeki kartlar reassignToId sütununa taşınır. */
export async function deleteStage(
  id: string,
  reassignToId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  if (reassignToId) {
    const { error: moveErr } = await supabase
      .from("customers")
      .update({ pipeline_stage_id: reassignToId })
      .eq("pipeline_stage_id", id)
      .eq("business_id", businessId);
    if (moveErr) {
      console.error("deleteStage/move:", moveErr);
      return { error: "Kartlar taşınamadı." };
    }
  }

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("deleteStage:", error);
    return { error: "Sütun silinemedi." };
  }

  revalidatePath("/leadler");
  return {};
}

export async function reorderStages(orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  // Döngüde await yerine tek turda paralel güncelleme (N+1 kaldırıldı).
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("pipeline_stages")
        .update({ position: i })
        .eq("id", id)
        .eq("business_id", businessId)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("reorderStages:", failed.error);
    return { error: "Sıralama güncellenemedi." };
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
