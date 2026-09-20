"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import {
  automationSchema,
  MESSAGE_ACTIONS,
  PARAM_TRIGGERS,
  type AutomationInput,
} from "./schema";

type ActionResult = { error?: string };

/**
 * Alan tutarlılığı: DB check kısıtları tetikleyici/aksiyon kimliğini
 * doğrular ama "mesaj aksiyonu seçildiyse mesaj dolu olmalı" gibi
 * kuralları doğrulamaz — onlar burada.
 */
function validateShape(v: AutomationInput): string | null {
  if (MESSAGE_ACTIONS.includes(v.action_id) && !v.message?.trim()) {
    return "Bu aksiyon için mesaj metni gerekli.";
  }
  if (PARAM_TRIGGERS.includes(v.trigger_id) && v.trigger_param == null) {
    return "Bu tetikleyici için bir değer girmelisin.";
  }
  if (v.action_id === "etiket_ekle" && !v.action_param?.trim()) {
    return "Eklenecek etiketi yazmalısın.";
  }
  return null;
}

export async function saveAutomation(
  input: AutomationInput
): Promise<ActionResult> {
  const parsed = automationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const v = parsed.data;
  const shapeError = validateShape(v);
  if (shapeError) return { error: shapeError };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const row = {
    business_id: businessId,
    title: v.title.trim(),
    active: v.active,
    trigger_id: v.trigger_id,
    trigger_param: PARAM_TRIGGERS.includes(v.trigger_id) ? v.trigger_param : null,
    action_id: v.action_id,
    action_param: v.action_param?.trim() || null,
    message: v.message?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = v.id
    ? await supabase
        .from("automations")
        .update(row)
        .eq("id", v.id)
        .eq("business_id", businessId)
    : await supabase.from("automations").insert(row);

  if (error) {
    console.error("saveAutomation:", error);
    return { error: "Kural kaydedilemedi." };
  }

  revalidatePath("/hatirlaticilar");
  return {};
}

/** Kuralı aç/kapat — liste üzerinden tek tıkla. */
export async function toggleAutomation(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("automations")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("toggleAutomation:", error);
    return { error: "Kural güncellenemedi." };
  }

  revalidatePath("/hatirlaticilar");
  return {};
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteAutomation:", error);
    return { error: "Kural silinemedi." };
  }

  revalidatePath("/hatirlaticilar");
  return {};
}
