"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { isModuleEnabled } from "@/lib/modules";
import { isQuietHour, SEND_FROM_HOUR, SEND_UNTIL_HOUR } from "@/lib/automations/plan";
import { sendBulkSms } from "@/lib/messaging/send";
import {
  buildAudience,
  personalize,
  type AudienceCustomer,
  type AudienceKey,
  type AudienceResult,
} from "@/lib/campaigns/audience";
import type { RhythmRow } from "@/lib/customer-rhythm";

import { audienceSchema, campaignSchema, type CampaignInput } from "./schema";

/** Tek kampanyada en fazla alıcı (sunucu süresi sınırı). */
const MAX_RECIPIENTS = 3000;

type Supabase = Awaited<ReturnType<typeof createClient>>;

const RHYTHM_COLS =
  "customer_id, visits, first_visit, last_visit, avg_interval_days, past_total, no_shows, cancels, next_appointment";

async function moduleOn(supabase: Supabase, businessId: string): Promise<boolean> {
  const { data } = await supabase.from("businesses").select("enabled_modules").eq("id", businessId).maybeSingle();
  return isModuleEnabled((data as { enabled_modules: string[] | null } | null)?.enabled_modules ?? null, "kampanyalar");
}

async function resolveAudience(
  supabase: Supabase,
  businessId: string,
  key: AudienceKey,
  now: Date
): Promise<AudienceResult | null> {
  const needsRhythm = key === "gelmeyen_30" || key === "geri_kazan";
  const [custRes, rhythmRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, phone, birthday, marketing_sms_at")
      .eq("business_id", businessId)
      .eq("is_lead", false)
      .limit(20000),
    needsRhythm
      ? supabase.from("customer_rhythm").select(RHYTHM_COLS).eq("business_id", businessId).limit(20000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (custRes.error || rhythmRes.error) {
    console.error("resolveAudience:", custRes.error ?? rhythmRes.error);
    return null;
  }
  return buildAudience(
    key,
    (custRes.data ?? []) as AudienceCustomer[],
    (rhythmRes.data ?? []) as RhythmRow[],
    now
  );
}

export type AudiencePreview = {
  count: number;
  noConsent: number;
  noPhone: number;
  sample: string[];
};

/** Seçilen kitlede kaç kişiye gideceği (gönderim yapmaz). */
export async function previewAudience(audience: string): Promise<{ error?: string; preview?: AudiencePreview }> {
  const parsed = audienceSchema.safeParse(audience);
  if (!parsed.success) return { error: "Kimlere gideceğini seçin." };

  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };

  const result = await resolveAudience(supabase, auth.businessId, parsed.data, new Date());
  if (!result) return { error: "Müşteri listesi okunamadı. Sayfayı yenileyip tekrar deneyin." };
  return {
    preview: {
      count: result.recipients.length,
      noConsent: result.noConsent,
      noPhone: result.noPhone,
      sample: result.recipients.slice(0, 3).map((r) => r.name),
    },
  };
}

/**
 * Kampanyayı gönderir: kitleyi sunucuda yeniden hesaplar (istemciden gelen
 * liste kullanılmaz), yalnızca izinli ve telefonu geçerli kişilere SMS atar,
 * sonucu kaydeder.
 */
export async function sendCampaign(
  input: CampaignInput
): Promise<{ error?: string; sent?: number; failed?: number }> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  const v = parsed.data;

  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId, userId } = auth;

  if (!(await moduleOn(supabase, businessId))) {
    return { error: "Kampanyalar bu işletmede kapalı. Ayarlar → Modüller'den açabilirsiniz." };
  }

  const now = new Date();
  if (isQuietHour(now)) {
    return {
      error: `Kampanya SMS'leri yalnızca ${String(SEND_FROM_HOUR).padStart(2, "0")}:00–${SEND_UNTIL_HOUR}:00 arasında gönderilir.`,
    };
  }

  // Çift tıklama / iki sekme: son 2 dakikada süren bir gönderim varsa dur.
  const since = new Date(now.getTime() - 2 * 60_000).toISOString();
  const { data: running, error: runningError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "sending")
    .gte("created_at", since)
    .limit(1);
  if (runningError) {
    console.error("sendCampaign check:", runningError);
    return { error: "Kampanyalar henüz hazır değil. Sistem güncellemesi tamamlanınca tekrar deneyin." };
  }
  if ((running ?? []).length > 0) return { error: "Bir kampanya şu an gönderiliyor. Birkaç dakika sonra tekrar deneyin." };

  const audience = await resolveAudience(supabase, businessId, v.audience, now);
  if (!audience) return { error: "Müşteri listesi okunamadı. Sayfayı yenileyip tekrar deneyin." };
  const recipients = audience.recipients;
  if (recipients.length === 0) return { error: "Bu grupta kampanya izni olan ve telefonu kayıtlı müşteri yok." };
  if (recipients.length > MAX_RECIPIENTS) {
    return { error: `Tek seferde en fazla ${MAX_RECIPIENTS.toLocaleString("tr-TR")} kişiye gönderilebilir. Daha dar bir grup seçin.` };
  }

  const { data: created, error: createError } = await supabase
    .from("campaigns")
    .insert({
      business_id: businessId,
      created_by: userId,
      name: v.name || `${now.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} kampanyası`,
      channel: "sms",
      audience: v.audience,
      body: v.body,
      recipient_count: recipients.length,
      status: "sending",
    })
    .select("id")
    .single();
  if (createError || !created) {
    console.error("sendCampaign create:", createError);
    return { error: "Kampanya kaydedilemedi. Tekrar deneyin." };
  }
  const campaignId = (created as { id: string }).id;

  let outcomes: { to: string; ok: boolean; error?: string }[];
  try {
    const res = await sendBulkSms(
      businessId,
      recipients.map((r) => ({ to: r.phone, body: personalize(v.body, r.name), customerId: r.customerId }))
    );
    if (!res.connected) {
      await supabase.from("campaigns").delete().eq("id", campaignId).eq("business_id", businessId);
      return { error: "SMS bağlantısı kurulmamış. Ayarlar → Bağlantılar'dan Netgsm bilgilerini girin." };
    }
    outcomes = res.outcomes;
  } catch (error) {
    console.error("sendCampaign send:", error);
    await supabase
      .from("campaigns")
      .update({ status: "failed", failed_count: recipients.length, sent_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("business_id", businessId);
    revalidatePath("/kampanyalar");
    return { error: "SMS gönderilemedi. Bağlantı bilgilerini kontrol edip tekrar deneyin." };
  }

  const byPhone = new Map(outcomes.map((o) => [o.to, o]));
  const rows = recipients.map((r) => {
    const o = byPhone.get(r.phone);
    return {
      campaign_id: campaignId,
      business_id: businessId,
      customer_id: r.customerId,
      phone: r.phone,
      status: o?.ok ? "sent" : "failed",
      error: o?.ok ? null : (o?.error ?? "Gönderilemedi"),
    };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("campaign_recipients").insert(rows.slice(i, i + 500));
    if (error) console.error("sendCampaign recipients:", error);
  }

  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.length - sent;
  await supabase
    .from("campaigns")
    .update({
      status: sent > 0 ? "sent" : "failed",
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("business_id", businessId);

  revalidatePath("/kampanyalar");
  if (sent === 0) return { error: "SMS'ler gönderilemedi. Netgsm bakiyenizi ve bağlantı bilgilerini kontrol edin." };
  return { sent, failed };
}
