"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { sendMessage } from "@/lib/messaging/send";
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

const DENIED: ActionResult = { error: "Bu işlem için yetkiniz yok." };

/** Hangi sağlayıcı hangi mesaj kanalını kullanıyor (test gönderimi için). */
const CHANNEL_OF: Partial<Record<Provider, Channel>> = {
  sms: "sms",
  smtp: "email",
  whatsapp: "whatsapp",
};

/** Ayarlar yalnızca işletme sahibine açık. */
async function assertOwnerAccess(): Promise<boolean> {
  const { role } = await getAccountContext();
  return can(role, "ayarlar");
}

/** Firma kartı: ad, sektör, telefon, e-posta, adres. */
export async function updateBusinessInfo(
  input: BusinessInfoInput
): Promise<ActionResult> {
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

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
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = ownerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name.trim(),
      phone: parsed.data.phone?.trim() || null,
    })
    .eq("id", user.id);

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
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = workingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

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
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

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
  if (!(await assertOwnerAccess())) return DENIED;

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
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

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
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { error: "Geçersiz sağlayıcı." };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

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
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { error: "Geçersiz sağlayıcı." };

  const channel = CHANNEL_OF[parsed.data];
  if (!channel) return { error: "Bu sağlayıcı test mesajı desteklemiyor." };

  if (!to.trim()) return { error: "Test için bir alıcı girin." };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

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
    return { error: res.error ?? "Test mesajı gönderilemedi." };
  }

  await supabase
    .from("integrations")
    .update({ status: "connected", last_error: null })
    .eq("business_id", businessId)
    .eq("provider", parsed.data);

  revalidatePath("/ayarlar");
  return {};
}
