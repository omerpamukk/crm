import { z } from "zod";

/** Ayarlar > Temel Bilgiler — firma kartı. */
export const businessInfoSchema = z.object({
  name: z.string().min(1, "Firma adı zorunludur"),
  sector: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Geçerli bir e-posta girin"
    ),
  address: z.string().optional(),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;

/** Ayarlar > Temel Bilgiler — işletme sahibi kartı. */
export const ownerProfileSchema = z.object({
  full_name: z.string().min(1, "Ad soyad zorunludur"),
  phone: z.string().optional(),
});

export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;

/** Tek bir günün çalışma saati. */
export const workingDaySchema = z.object({
  /** 1 = Pazartesi … 7 = Pazar */
  day: z.number().int().min(1).max(7),
  open: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Saat SS:DD biçiminde olmalı"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Saat SS:DD biçiminde olmalı"),
});

export const workingHoursSchema = z.object({
  days: z.array(workingDaySchema).length(7, "7 gün gönderilmeli"),
});

export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;
export type WorkingDay = z.infer<typeof workingDaySchema>;

/* ---------------------------------------------------------------
 * Ayarlar > Bildirimler (0023_integrations.sql → notification_settings)
 * ------------------------------------------------------------- */

/** Bildirim anahtarları — notification_settings.key ile birebir. */
export const NOTIF_KEYS = [
  "yeni_lead",
  "gecikmis_odeme",
  "randevu_hatirlatma",
  "gorev_deadline",
  "yeni_yorum",
  "kritik_stok",
  "sabah_ozeti",
  "gun_sonu_ozeti",
] as const;

export type NotifKey = (typeof NOTIF_KEYS)[number];

export const notifChannelSchema = z.enum(["panel", "sms", "email", "whatsapp"]);
export const notifRoleSchema = z.enum(["owner", "reception", "specialist"]);

export const notificationSettingSchema = z.object({
  key: z.enum(NOTIF_KEYS),
  enabled: z.boolean(),
  channels: z.array(notifChannelSchema),
  recipient_roles: z.array(notifRoleSchema),
  /** Yalnızca özet bildirimleri için (SS:DD). */
  send_at: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Saat SS:DD biçiminde olmalı")
    .nullable()
    .optional(),
});

export const notificationSettingsSchema = z.object({
  items: z.array(notificationSettingSchema).min(1),
});

export type NotificationSettingInput = z.infer<typeof notificationSettingSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

/* ---------------------------------------------------------------
 * Ayarlar > Entegrasyonlar (0023_integrations.sql → integrations)
 * ------------------------------------------------------------- */

export const providerSchema = z.enum([
  "whatsapp",
  "sms",
  "smtp",
  "instagram",
  "facebook",
  "google_business",
  "meta_ads",
]);

export type Provider = z.infer<typeof providerSchema>;

/**
 * Bağlantı kaydı. `credentials` sağlayıcıya göre değişen anahtarlar
 * tuttuğu için serbest sözlük; zorunlu alan kontrolü action içinde
 * sağlayıcı bazında yapılır (REQUIRED_KEYS).
 */
export const integrationSchema = z.object({
  provider: providerSchema,
  account_label: z.string().optional(),
  credentials: z.record(z.string(), z.string()),
});

export type IntegrationInput = z.infer<typeof integrationSchema>;
