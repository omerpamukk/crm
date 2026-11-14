"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { isRuleRunnable, isRuleSupported, isSupportedAction, isSupportedTrigger } from "@/lib/automations/supported";

import {
  automationSchema,
  MESSAGE_ACTIONS,
  PARAM_TRIGGERS,
  TEMPLATE_FORMAT,
  TEMPLATE_NAME,
  TEMPLATE_REQUIRED,
  UNSUPPORTED_ACTION,
  UNSUPPORTED_EMAIL_MARKETING,
  UNSUPPORTED_TRIGGER,
  WHATSAPP_ACTIONS,
  type AutomationInput,
} from "./schema";

type ActionResult = { error?: string };

/**
 * Alan tutarlılığı: DB check kısıtları tetikleyici/aksiyon kimliğini
 * doğrular ama "mesaj aksiyonu seçildiyse mesaj dolu olmalı" gibi
 * kuralları doğrulamaz — onlar burada.
 */
function validateShape(v: AutomationInput): string | null {
  if (!isSupportedTrigger(v.trigger_id)) return UNSUPPORTED_TRIGGER;
  if (!isSupportedAction(v.action_id)) return UNSUPPORTED_ACTION;
  if (!isRuleSupported(v)) return UNSUPPORTED_EMAIL_MARKETING;
  if (WHATSAPP_ACTIONS.includes(v.action_id)) {
    const name = v.wa_template?.trim() ?? "";
    if (!name) return TEMPLATE_REQUIRED;
    if (!TEMPLATE_NAME.test(name)) return TEMPLATE_FORMAT;
  }
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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const row = {
    business_id: businessId,
    title: v.title.trim(),
    active: v.active,
    trigger_id: v.trigger_id,
    trigger_param: PARAM_TRIGGERS.includes(v.trigger_id) ? v.trigger_param : null,
    action_id: v.action_id,
    action_param: v.action_param?.trim() || null,
    message: v.message?.trim() || null,
    wa_template: WHATSAPP_ACTIONS.includes(v.action_id) ? v.wa_template?.trim() || null : null,
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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  if (active) {
    const { data: rule } = await supabase
      .from("automations")
      .select("trigger_id, action_id, wa_template")
      .eq("id", id)
      .eq("business_id", businessId)
      .maybeSingle();
    const r = rule as { trigger_id: string; action_id: string; wa_template: string | null } | null;
    if (r && !isRuleSupported(r)) {
      return { error: "Bu kural henüz çalışmıyor. Açmak için tetikleyicisini ya da aksiyonunu değiştirin." };
    }
    if (r && !isRuleRunnable(r)) {
      return { error: "Şablon adı eksik. Kuralı düzenleyip Meta'da onaylı şablonun adını yazın." };
    }
  }

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
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

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
