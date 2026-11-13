/**
 * Planlayıcının gerçekten çalıştırabildiği tetikleyici ve aksiyonlar.
 *
 * Kural ekranı yalnızca bunları seçtirir; planlayıcı (plan.ts) da yalnızca
 * bunları işler. "Görünen her şey çalışır" ilkesi: listede olmayan bir
 * tetikleyici ya da aksiyon kurulabiliyorsa hiç çalışmayan bir kural
 * oluşur.
 *
 * Olay anında çalışması gereken tetikleyiciler (randevu tamamlandı,
 * gelmedi, yeni lead, yeni müşteri, ödeme alındı) ve mesaj dışı aksiyonlar
 * (hatırlatma, görev, etiket) ilgili server action'lardan tetiklenecek
 * şekilde yazılınca buraya eklenir.
 */

export const SUPPORTED_TRIGGERS = [
  "randevu_oncesi",
  "odeme_gecikti",
  "paket_bitiyor",
  "pasif_musteri",
  "dogum_gunu",
] as const;

export const SUPPORTED_ACTIONS = ["wa", "sms", "eposta", "indirim"] as const;

/**
 * Ticari ileti sayılan kurallar: müşteriye kampanya ya da geri kazanım
 * amacıyla giden mesajlar. Bunlar yalnızca pazarlama izni (İYS) olan
 * müşterilere gider. Randevu hatırlatması ve borç bildirimi
 * bilgilendirme mesajıdır, izin aranmaz.
 */
export const MARKETING_TRIGGERS = ["pasif_musteri", "dogum_gunu", "paket_bitiyor"] as const;
export const MARKETING_ACTIONS = ["indirim"] as const;

export function isSupportedTrigger(id: string): boolean {
  return (SUPPORTED_TRIGGERS as readonly string[]).includes(id);
}

export function isSupportedAction(id: string): boolean {
  return (SUPPORTED_ACTIONS as readonly string[]).includes(id);
}

export function isRuleSupported(rule: { trigger_id: string; action_id: string }): boolean {
  return isSupportedTrigger(rule.trigger_id) && isSupportedAction(rule.action_id);
}

export function isMarketingRule(rule: { trigger_id: string; action_id: string }): boolean {
  return (
    (MARKETING_TRIGGERS as readonly string[]).includes(rule.trigger_id) ||
    (MARKETING_ACTIONS as readonly string[]).includes(rule.action_id)
  );
}
