import { describe, expect, it } from "vitest";

import { fillTemplate, hasConsent, isQuietHour, type Rule } from "./plan";
import { isMarketingRule, isRuleSupported } from "./supported";

const rule = (trigger_id: string, action_id = "sms"): Rule => ({
  id: "r1",
  business_id: "b1",
  trigger_id,
  trigger_param: null,
  action_id,
  message: "Merhaba {ad}",
});

describe("sessiz saatler (İstanbul)", () => {
  it("09:00–21:00 arası gönderim yapılır", () => {
    expect(isQuietHour(new Date("2026-11-14T06:00:00Z"))).toBe(false);
    expect(isQuietHour(new Date("2026-11-14T17:59:00Z"))).toBe(false);
  });

  it("gece ve sabah erken gönderim yapılmaz", () => {
    expect(isQuietHour(new Date("2026-11-14T05:59:00Z"))).toBe(true);
    expect(isQuietHour(new Date("2026-11-14T18:00:00Z"))).toBe(true);
    expect(isQuietHour(new Date("2026-11-14T22:30:00Z"))).toBe(true);
  });
});

describe("pazarlama izni", () => {
  const izinli = { full_name: "Ayşe Yılmaz", marketing_sms_at: "2026-10-01T10:00:00Z", marketing_email_at: null };
  const izinsiz = { full_name: "Ayşe Yılmaz", marketing_sms_at: null, marketing_email_at: null };

  it("randevu hatırlatması ve borç bildirimi izin aramaz", () => {
    expect(hasConsent(rule("randevu_oncesi"), "sms", izinsiz)).toBe(true);
    expect(hasConsent(rule("odeme_gecikti"), "whatsapp", izinsiz)).toBe(true);
  });

  it("doğum günü, geri kazanım ve paket yenileme yalnızca izinliye gider", () => {
    for (const t of ["dogum_gunu", "pasif_musteri", "paket_bitiyor"]) {
      expect(hasConsent(rule(t), "sms", izinsiz)).toBe(false);
      expect(hasConsent(rule(t), "whatsapp", izinli)).toBe(true);
    }
  });

  it("indirim mesajı her tetikleyicide ticari sayılır", () => {
    expect(isMarketingRule(rule("randevu_oncesi", "indirim"))).toBe(true);
    expect(hasConsent(rule("randevu_oncesi", "indirim"), "whatsapp", izinsiz)).toBe(false);
  });

  it("e-posta için e-posta izni aranır", () => {
    expect(hasConsent(rule("dogum_gunu", "eposta"), "email", izinli)).toBe(false);
  });
});

describe("desteklenen kurallar", () => {
  it("olay anında çalışan tetikleyiciler ve mesaj dışı aksiyonlar desteklenmez", () => {
    expect(isRuleSupported(rule("randevu_tamamlandi"))).toBe(false);
    expect(isRuleSupported(rule("yeni_lead"))).toBe(false);
    expect(isRuleSupported(rule("randevu_oncesi", "gorev"))).toBe(false);
    expect(isRuleSupported(rule("randevu_oncesi", "wa"))).toBe(true);
  });
});

describe("mesaj şablonu", () => {
  it("{ad} müşterinin ilk adıyla dolar", () => {
    expect(fillTemplate("Merhaba {ad}, {ad}!", "  Ayşe   Yılmaz ")).toBe("Merhaba Ayşe, Ayşe!");
  });
});
