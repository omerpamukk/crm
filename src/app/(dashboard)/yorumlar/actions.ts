"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";

const REVIEW_MESSAGE =
  "Merhaba {ad}, bugünkü ziyaretiniz nasıldı? 1 dakikanızı ayırıp puan verir misiniz: {link}";

/** Yorum isteme kuralını açar/kapatır; yoksa oluşturur (0025 automations). */
export async function setReviewRequests(enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { data: existing, error: readError } = await supabase
    .from("automations")
    .select("id")
    .eq("business_id", businessId)
    .eq("trigger_id", "randevu_tamamlandi")
    .limit(1);
  if (readError) {
    console.error("setReviewRequests read:", readError);
    return { error: "Ayar kaydedilemedi. Tekrar deneyin." };
  }

  const rule = (existing ?? [])[0] as { id: string } | undefined;
  const { error } = rule
    ? await supabase
        .from("automations")
        .update({ active: enabled, updated_at: new Date().toISOString() })
        .eq("id", rule.id)
        .eq("business_id", businessId)
    : await supabase.from("automations").insert({
        business_id: businessId,
        title: "Yorum isteme",
        active: enabled,
        trigger_id: "randevu_tamamlandi",
        trigger_param: null,
        action_id: "sms",
        action_param: null,
        message: REVIEW_MESSAGE,
      });
  if (error) {
    console.error("setReviewRequests:", error);
    return { error: "Ayar kaydedilemedi. Tekrar deneyin." };
  }
  revalidatePath("/yorumlar");
  revalidatePath("/hatirlaticilar");
  return {};
}

const urlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Bağlantı https:// ile başlamalı.");

export async function saveGoogleReviewUrl(url: string): Promise<{ error?: string }> {
  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz bağlantı." };
  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { error } = await supabase
    .from("businesses")
    .update({ google_review_url: parsed.data || null, updated_at: new Date().toISOString() })
    .eq("id", auth.businessId);
  if (error) {
    console.error("saveGoogleReviewUrl:", error);
    return { error: "Bağlantı kaydedilemedi. Tekrar deneyin." };
  }
  revalidatePath("/yorumlar");
  return {};
}

/** Memnun olmayan müşteriyle ilgilenildi (arandı) olarak işaretle. */
export async function markFeedbackHandled(id: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Geçersiz kayıt." };
  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { error } = await supabase
    .from("feedback_requests")
    .update({ handled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", auth.businessId);
  if (error) {
    console.error("markFeedbackHandled:", error);
    return { error: "Kaydedilemedi. Tekrar deneyin." };
  }
  revalidatePath("/yorumlar");
  return {};
}
