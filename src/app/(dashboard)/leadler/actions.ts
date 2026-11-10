"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { error } = await supabase
    .from("customers")
    .update({ pipeline_stage_id: stageId })
    .eq("id", customerId)
    .eq("business_id", businessId);
  if (error) {
    console.error("moveLeadToStage:", error);
    return { error: "Lead taşınamadı. Biraz sonra tekrar deneyin." };
  }

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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

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
    name: name.trim() || "Yeni aşama",
    color: "#64748B",
    position: nextPos,
  });
  if (error) {
    console.error("createStage:", error);
    return { error: "Aşama eklenemedi. Biraz sonra tekrar deneyin." };
  }

  revalidatePath("/leadler");
  return {};
}

export async function renameStage(
  id: string,
  name: string
): Promise<ActionResult> {
  if (!name.trim()) return { error: "Aşama adı boş olamaz." };
  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ color })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("updateStageColor:", error);
    return { error: "Renk değiştirilemedi." };
  }
  revalidatePath("/leadler");
  return {};
}

/** Aşamayı siler; içindeki lead'ler reassignToId sütununa taşınır. */
export async function deleteStage(
  id: string,
  reassignToId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  if (reassignToId) {
    const { error: moveErr } = await supabase
      .from("customers")
      .update({ pipeline_stage_id: reassignToId })
      .eq("pipeline_stage_id", id)
      .eq("business_id", businessId);
    if (moveErr) {
      console.error("deleteStage/move:", moveErr);
      return { error: "Lead'ler taşınamadı." };
    }
  }

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("deleteStage:", error);
    return { error: "Aşama silinemedi." };
  }

  revalidatePath("/leadler");
  return {};
}

export async function reorderStages(orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { error } = await supabase
    .from("customers")
    .update({ is_lead: false, pipeline_stage_id: null, status: "active" })
    .eq("id", customerId)
    .eq("business_id", businessId);
  if (error) {
    console.error("convertLeadToCustomer:", error);
    return { error: "Müşteriye çevrilemedi. Biraz sonra tekrar deneyin." };
  }

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
