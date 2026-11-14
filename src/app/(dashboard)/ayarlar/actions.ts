"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { sendMessage } from "@/lib/messaging/send";
import { cleanModules, isModuleEnabled } from "@/lib/modules";
import type { Channel } from "@/lib/messaging/types";
import {
  businessInfoSchema,
  ownerProfileSchema,
  workingHoursSchema,
  notificationSettingsSchema,
  integrationSchema,
  providerSchema,
  type BusinessInfoInput,
  type OwnerProfileInput,
  type WorkingHoursInput,
  type NotificationSettingsInput,
  type IntegrationInput,
  type Provider,
} from "./schema";

type ActionResult = { error?: string };

/** Hangi sağlayıcı hangi mesaj kanalını kullanıyor (test gönderimi için). */
const CHANNEL_OF: Partial<Record<Provider, Channel>> = {
  sms: "sms",
  smtp: "email",
  whatsapp: "whatsapp",
};

/** Firma kartı: ad, sektör, telefon, e-posta, adres. */
export async function updateBusinessInfo(
  input: BusinessInfoInput
): Promise<ActionResult> {
  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const v = parsed.data;
  const { error } = await supabase
    .from("businesses")
    .update({
      name: v.name.trim(),
      sector: v.sector?.trim() || null,
      phone: v.phone?.trim() || null,
      email: v.email?.trim() || null,
      address: v.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    console.error("updateBusinessInfo:", error);
    return { error: "Firma bilgileri kaydedilemedi." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/** İşletme sahibi kartı: ad soyad, telefon. */
export async function updateOwnerProfile(
  input: OwnerProfileInput
): Promise<ActionResult> {
  const parsed = ownerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const user = { id: auth.userId };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name.trim(),
      phone: parsed.data.phone?.trim() || null,
    })
    .eq("id", user.id)
    .eq("business_id", auth.businessId);

  if (error) {
    console.error("updateOwnerProfile:", error);
    return { error: "Profil kaydedilemedi." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/**
 * Çalışma saatleri: businesses.working_hours (jsonb).
 * booking_settings de senkron tutulur — online randevu aynı saatleri kullanmalı.
 */
export async function updateWorkingHours(
  input: WorkingHoursInput
): Promise<ActionResult> {
  const parsed = workingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const days = parsed.data.days;

  const { error } = await supabase
    .from("businesses")
    .update({
      working_hours: { days },
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    console.error("updateWorkingHours:", error);
    return { error: "Çalışma saatleri kaydedilemedi." };
  }

  // Online randevu ayarlarını da hizala (varsa).
  const open = days.filter((d) => d.open);
  if (open.length > 0) {
    await supabase
      .from("booking_settings")
      .update({
        work_days: open.map((d) => d.day),
        // booking_settings tek bir global aralık tutuyor:
        // en erken açılış ve en geç kapanış kullanılır.
        start_time: open.reduce((a, d) => (d.start < a ? d.start : a), open[0].start),
        end_time: open.reduce((a, d) => (d.end > a ? d.end : a), open[0].end),
      })
      .eq("business_id", businessId);
  }

  revalidatePath("/ayarlar");
  revalidatePath("/randevu-linki");
  return {};
}

/* ---------------------------------------------------------------
 * Bildirim tercihleri
 * ------------------------------------------------------------- */

/** Tüm bildirim tercihlerini tek seferde yazar (upsert, key bazlı). */
export async function updateNotificationSettings(
  input: NotificationSettingsInput
): Promise<ActionResult> {
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const rows = parsed.data.items.map((i) => ({
    business_id: businessId,
    key: i.key,
    enabled: i.enabled,
    channels: i.channels,
    recipient_roles: i.recipient_roles,
    send_at: i.send_at ?? null,
  }));

  // Tek upsert — döngüde await yok.
  const { error } = await supabase
    .from("notification_settings")
    .upsert(rows, { onConflict: "business_id,key" });

  if (error) {
    console.error("updateNotificationSettings:", error);
    return { error: "Bildirim tercihleri kaydedilemedi." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/* ---------------------------------------------------------------
 * Entegrasyonlar
 * ------------------------------------------------------------- */

/**
 * Her sağlayıcının bağlanabilmesi için gereken kimlik alanları.
 * Boş dizi = bu sağlayıcı OAuth ile bağlanır (henüz uygulama onayı bekliyor).
 */
const REQUIRED_KEYS: Record<Provider, string[]> = {
  sms: ["usercode", "password", "msgheader"],
  smtp: ["api_key", "from"],
  whatsapp: ["phone_number_id", "access_token"],
  instagram: [],
  facebook: [],
  google_business: [],
  meta_ads: [],
};

/** Bağlantı kur / kimlik bilgisini güncelle. */
export async function saveIntegration(
  input: IntegrationInput
): Promise<ActionResult> {
  const parsed = integrationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const { provider, account_label, credentials } = parsed.data;

  const required = REQUIRED_KEYS[provider];
  if (required.length === 0) {
    return {
      error:
        "Bu sağlayıcı hesap onayı gerektiriyor; şimdilik bağlanamıyor.",
    };
  }

  const missing = required.filter((k) => !credentials[k]?.trim());
  if (missing.length > 0) {
    return { error: "Tüm alanları doldurun." };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  // Yalnızca beklenen anahtarlar yazılır — formdan gelen fazlalık alınmaz.
  const clean: Record<string, string> = {};
  for (const k of required) clean[k] = credentials[k].trim();

  const { error } = await supabase.from("integrations").upsert(
    {
      business_id: businessId,
      provider,
      status: "connected",
      account_label: account_label?.trim() || null,
      credentials: clean,
      last_error: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,provider" }
  );

  if (error) {
    console.error("saveIntegration:", error);
    return { error: "Bağlantı kaydedilemedi." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/** Bağlantıyı kaldır — kimlik bilgileri de silinir. */
export async function disconnectIntegration(
  provider: Provider
): Promise<ActionResult> {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { error: "Geçersiz sağlayıcı." };

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", parsed.data);

  if (error) {
    console.error("disconnectIntegration:", error);
    return { error: "Bağlantı kaldırılamadı." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/**
 * Bağlantıyı gerçekten dener: kayıtlı kimlik bilgisiyle test mesajı gönderir.
 * Sonuç message_log'a düşer; hata olursa integrations.last_error güncellenir.
 */
export async function testIntegration(
  provider: Provider,
  to: string
): Promise<ActionResult> {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { error: "Geçersiz sağlayıcı." };

  const channel = CHANNEL_OF[parsed.data];
  if (!channel) return { error: "Bu bağlantı için deneme mesajı gönderilemiyor." };

  if (!to.trim()) return { error: "Deneme mesajı için bir alıcı girin." };

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const res = await sendMessage({
    businessId,
    channel,
    to: to.trim(),
    subject: "CRM test mesajı",
    body: "Bu bir test mesajıdır. Bağlantınız çalışıyor.",
  });

  if (!res.ok) {
    await supabase
      .from("integrations")
      .update({ status: "error", last_error: res.error ?? null })
      .eq("business_id", businessId)
      .eq("provider", parsed.data);

    revalidatePath("/ayarlar");
    return { error: "Deneme mesajı gönderilemedi. Bağlantı bilgilerini ve alıcıyı kontrol edin." };
  }

  await supabase
    .from("integrations")
    .update({ status: "connected", last_error: null })
    .eq("business_id", businessId)
    .eq("provider", parsed.data);

  revalidatePath("/ayarlar");
  return {};
}

/**
 * Açık modüller (0036). Yalnızca bilinen anahtarlar kaydedilir.
 *
 * "Online randevu linki" kapanınca herkese açık link da kapatılır
 * (booking_settings.is_active = false); aksi halde müşteriler menüde
 * görünmeyen linkten randevu almaya devam ederdi. Modül yeniden açılınca
 * link otomatik AÇILMAZ: işletme sahibi Online randevu sayfasından bilerek
 * açar. `notice` arayüzün gösterebileceği bilgi mesajıdır.
 */
export async function updateModules(modules: string[]): Promise<ActionResult & { notice?: string }> {
  if (!Array.isArray(modules) || modules.some((m) => typeof m !== "string")) {
    return { error: "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const next = cleanModules(modules);

  const { data: current } = await supabase
    .from("businesses")
    .select("enabled_modules")
    .eq("id", businessId)
    .maybeSingle();
  const before = (current as { enabled_modules: string[] | null } | null)?.enabled_modules ?? null;
  const wasOn = isModuleEnabled(before, "randevu_linki");
  const isOn = next.includes("randevu_linki");

  // Önce linki kapat: modül kaydı başarısız olursa link yine de kapalı kalır.
  if (!isOn) {
    const { error: linkErr } = await supabase
      .from("booking_settings")
      .update({ is_active: false })
      .eq("business_id", businessId);
    if (linkErr) {
      console.error("updateModules booking_settings:", linkErr);
      return { error: "Online randevu linki kapatılamadı. Biraz sonra tekrar deneyin." };
    }
  }

  const { error } = await supabase
    .from("businesses")
    .update({ enabled_modules: next, updated_at: new Date().toISOString() })
    .eq("id", businessId);

  if (error) {
    console.error("updateModules:", error);
    return { error: "Modüller kaydedilemedi." };
  }

  revalidatePath("/", "layout");
  if (!wasOn && isOn) {
    return { notice: "Online randevu linki kapalı. Açmak için Online randevu sayfasına gidin." };
  }
  if (wasOn && !isOn) {
    return { notice: "Online randevu linki de kapatıldı; müşteriler artık bu linkten randevu alamaz." };
  }
  return {};
}

/** Sadakat kartı ayarı (0040). target null = kapalı. */
export async function updateLoyalty(input: {
  target: number | null;
  reward: string;
  notifyBefore: number | null;
}): Promise<ActionResult> {
  const target = input.target;
  if (target !== null && (!Number.isInteger(target) || target < 2 || target > 50)) {
    return { error: "Ziyaret sayısı 2 ile 50 arasında olmalı." };
  }
  const nb = input.notifyBefore;
  if (nb !== null && (!Number.isInteger(nb) || nb < 1 || nb > 5)) return { error: "Geçersiz hatırlatma." };
  const reward = (input.reward ?? "").trim().slice(0, 120);
  if (target !== null && !reward) return { error: "Hediyeyi yazın (ör. Ücretsiz fön)." };

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { error } = await supabase
    .from("businesses")
    .update({ loyalty_target: target, loyalty_reward: reward || null, loyalty_notify_before: nb, updated_at: new Date().toISOString() })
    .eq("id", auth.businessId);
  if (error) {
    console.error("updateLoyalty:", error);
    return { error: "Sadakat kartı kaydedilemedi." };
  }
  revalidatePath("/ayarlar");
  revalidatePath("/musteriler", "layout");
  return {};
}

/** Herkese açık işletme sayfası (0040). */
export async function updatePublicProfile(input: { enabled: boolean; slug: string; about: string }): Promise<ActionResult> {
  const slug = (input.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) {
    return { error: "Adres 3–40 karakter olmalı; yalnızca küçük harf, rakam ve tire (ör. defne-guzellik)." };
  }
  const about = (input.about ?? "").trim().slice(0, 600);

  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const { error } = await supabase
    .from("businesses")
    .update({ profile_public: input.enabled, slug, profile_about: about || null, updated_at: new Date().toISOString() })
    .eq("id", auth.businessId);
  if (error) {
    if (error.code === "23505") return { error: "Bu adres başka bir işletmede kullanılıyor. Başka bir adres deneyin." };
    console.error("updatePublicProfile:", error);
    return { error: "Sayfa ayarı kaydedilemedi." };
  }
  revalidatePath("/ayarlar");
  return {};
}

/**
 * İşletme logosu: dosya tarayıcıdan business-logos/<işletme>/ klasörüne
 * yüklenir (0018 storage kuralları), burada yalnızca adresi kaydedilir.
 * Adres bu işletmenin klasörüne ait değilse reddedilir.
 */
export async function updateLogo(url: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "ayarlar");
  if ("error" in auth) return { error: auth.error };
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${auth.businessId}/`;
  if (url !== null && (typeof url !== "string" || !url.startsWith(prefix) || url.length > 500)) {
    return { error: "Logo kaydedilemedi. Dosyayı yeniden yükleyin." };
  }
  const { error } = await supabase
    .from("businesses")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", auth.businessId);
  if (error) {
    console.error("updateLogo:", error);
    return { error: "Logo kaydedilemedi." };
  }
  revalidatePath("/", "layout");
  return {};
}
