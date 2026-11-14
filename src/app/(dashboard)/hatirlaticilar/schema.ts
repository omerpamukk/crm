import { z } from "zod";

import { isRuleSupported, isSupportedAction, isSupportedTrigger } from "@/lib/automations/supported";

export const UNSUPPORTED_TRIGGER = "Bu tetikleyici henüz çalışmıyor. Listeden başka bir tetikleyici seçin.";
export const UNSUPPORTED_EMAIL_MARKETING =
  "E-posta ile kampanya mesajı henüz çalışmıyor. Aksiyon olarak SMS ya da WhatsApp seçin.";
export const UNSUPPORTED_ACTION = "Bu aksiyon henüz çalışmıyor. Mesaj gönderen bir aksiyon seçin.";

/**
 * Otomatik hatırlatma kuralları (0025_automations.sql).
 *
 * Tetikleyici ve aksiyon kimlikleri DB'deki check kısıtlarıyla birebir
 * aynı olmalı — biri değişirse diğeri de değişmeli.
 */

export const TRIGGER_IDS = [
  "randevu_oncesi",
  "randevu_tamamlandi",
  "noshow",
  "yeni_lead",
  "yeni_musteri",
  "odeme_alindi",
  "odeme_gecikti",
  "paket_bitiyor",
  "pasif_musteri",
  "dogum_gunu",
] as const;

export const ACTION_IDS = [
  "wa",
  "sms",
  "eposta",
  "indirim",
  "hatirlatma",
  "gorev",
  "etiket_ekle",
] as const;

export type TriggerId = (typeof TRIGGER_IDS)[number];
export type ActionId = (typeof ACTION_IDS)[number];

export const automationSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Kural adı zorunludur").max(80, "Kural adı çok uzun"),
  active: z.boolean(),
  trigger_id: z.enum(TRIGGER_IDS),
  trigger_param: z.number().int().positive("Değer 0'dan büyük olmalı").nullable(),
  action_id: z.enum(ACTION_IDS),
  action_param: z.string().max(80).nullable(),
  message: z.string().max(600, "Mesaj en fazla 600 karakter olabilir").nullable(),
  wa_template: z.string().max(100).nullable().optional(),
});

export type AutomationInput = z.infer<typeof automationSchema>;

/** WhatsApp'tan giden aksiyonlar — Meta onaylı şablon adı ister. */
export const WHATSAPP_ACTIONS: ActionId[] = ["wa", "indirim"];

/** Meta şablon adı: küçük harf, rakam, alt çizgi. */
export const TEMPLATE_NAME = /^[a-z0-9_]+$/;
export const TEMPLATE_REQUIRED = "WhatsApp mesajı için Meta'da onaylı şablonun adını yazın.";
export const TEMPLATE_FORMAT = "Şablon adı yalnızca küçük harf, rakam ve alt çizgi içerir (ör. randevu_hatirlatma).";

/** Mesaj gerektiren aksiyonlar — boş mesajla kaydedilmemeli. */
export const MESSAGE_ACTIONS: ActionId[] = ["wa", "sms", "eposta", "indirim"];

/** Sayısal parametre gerektiren tetikleyiciler. */
export const PARAM_TRIGGERS: TriggerId[] = [
  "randevu_oncesi",
  "odeme_gecikti",
  "paket_bitiyor",
  "pasif_musteri",
];

/** Kural formu değerleri (hepsi metin; gönderirken sayıya çevrilir). */
export const ruleFormSchema = z
  .object({
    title: z.string().max(80, "Kural adı çok uzun"),
    active: z.boolean(),
    trigger_id: z.enum(TRIGGER_IDS),
    trigger_param: z.string(),
    action_id: z.enum(ACTION_IDS),
    action_param: z.string().max(80, "Etiket çok uzun"),
    message: z.string().max(600, "Mesaj en fazla 600 karakter olabilir"),
    wa_template: z.string().max(100, "Şablon adı çok uzun"),
  })
  .superRefine((v, ctx) => {
    if (WHATSAPP_ACTIONS.includes(v.action_id)) {
      const name = v.wa_template.trim();
      if (!name) ctx.addIssue({ code: "custom", path: ["wa_template"], message: TEMPLATE_REQUIRED });
      else if (!TEMPLATE_NAME.test(name)) ctx.addIssue({ code: "custom", path: ["wa_template"], message: TEMPLATE_FORMAT });
    }
    if (!isSupportedTrigger(v.trigger_id)) {
      ctx.addIssue({ code: "custom", path: ["trigger_id"], message: UNSUPPORTED_TRIGGER });
    }
    if (!isSupportedAction(v.action_id)) {
      ctx.addIssue({ code: "custom", path: ["action_id"], message: UNSUPPORTED_ACTION });
    }
    if (isSupportedTrigger(v.trigger_id) && isSupportedAction(v.action_id) && !isRuleSupported(v)) {
      ctx.addIssue({ code: "custom", path: ["action_id"], message: UNSUPPORTED_EMAIL_MARKETING });
    }
    if (PARAM_TRIGGERS.includes(v.trigger_id) && !/^[1-9]\d*$/.test(v.trigger_param.trim())) {
      ctx.addIssue({ code: "custom", path: ["trigger_param"], message: "0'dan büyük bir sayı yazın" });
    }
    if (MESSAGE_ACTIONS.includes(v.action_id) && !v.message.trim()) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "Gönderilecek mesajı yazın" });
    }
    if (v.action_id === "etiket_ekle" && !v.action_param.trim()) {
      ctx.addIssue({ code: "custom", path: ["action_param"], message: "Eklenecek etiketi yazın" });
    }
  });

export type RuleFormInput = z.infer<typeof ruleFormSchema>;
