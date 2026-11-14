import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  appointmentSendAt,
  debtOverdueSince,
  fillTemplate,
  hasConsent,
  isFirstVisit,
  isQuietHour,
  planAutomations,
  planRule,
  type Rule,
} from "./plan";
import { isMarketingRule, isRuleRunnable, isRuleSupported } from "./supported";

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
    expect(isRuleSupported(rule("yeni_lead"))).toBe(false);
    expect(isRuleSupported(rule("noshow"))).toBe(false);
    expect(isRuleSupported(rule("randevu_oncesi", "gorev"))).toBe(false);
    expect(isRuleSupported(rule("randevu_oncesi", "wa"))).toBe(true);
  });
});

describe("mesaj şablonu", () => {
  it("{ad} müşterinin ilk adıyla dolar", () => {
    expect(fillTemplate("Merhaba {ad}, {ad}!", "  Ayşe   Yılmaz ")).toBe("Merhaba Ayşe, Ayşe!");
  });
});

// ---------------------------------------------------------------------------
// Planlayıcı (sahte Supabase istemcisiyle)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** Yalnızca planlayıcının kullandığı süzgeçleri uygulayan, zincirlenebilir sahte istemci. */
function fakeAdmin(tables: Record<string, Row[]>) {
  const inserted: Row[] = [];
  const client = {
    inserted,
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      let range: [number, number] | null = null;
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), chain),
        neq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] !== v)), chain),
        gt: (c: string, v: number) => ((rows = rows.filter((r) => Number(r[c]) > v)), chain),
        gte: (c: string, v: string) => ((rows = rows.filter((r) => String(r[c]) >= v)), chain),
        lte: (c: string, v: string) => ((rows = rows.filter((r) => String(r[c]) <= v)), chain),
        in: (c: string, v: unknown[]) => ((rows = rows.filter((r) => v.includes(r[c]))), chain),
        is: (c: string, v: unknown) => ((rows = rows.filter((r) => (r[c] ?? null) === v)), chain),
        not: () => chain,
        update: () => chain,
        // reminders için tekil anahtar (automation, müşteri, an) ihlalini taklit eder.
        insert: (v: Row | Row[]) => {
          const list = Array.isArray(v) ? v : [v];
          const store = (tables[table] ??= []);
          const key = (r: Row) => `${r.automation_id}|${r.customer_id}|${r.scheduled_at}`;
          const keys = [...store, ...list].map(key);
          const dup = table === "reminders" && new Set(keys).size !== keys.length;
          if (!dup) {
            store.push(...list);
            inserted.push(...list);
          }
          const res = { data: dup ? null : list.map((_, i) => ({ id: String(i) })), error: dup ? { code: "23505" } : null };
          const p = Promise.resolve(res) as Promise<typeof res> & { select: () => Promise<typeof res> };
          p.select = () => Promise.resolve(res);
          return p;
        },
        range: (a: number, b: number) => ((range = [a, b]), chain),
        then: (resolve: (v: unknown) => void) => {
          const out = range ? rows.slice(range[0], range[1] + 1) : rows;
          resolve({ data: out, error: null });
        },
      };
      return chain;
    },
  };
  return client as unknown as SupabaseClient & { inserted: Row[] };
}

const baseRule = (over: Partial<Rule>): Rule => ({
  id: "r1",
  business_id: "b1",
  trigger_id: "randevu_oncesi",
  trigger_param: 2,
  action_id: "sms",
  message: "Merhaba {ad}",
  ...over,
});

const customerRow = { full_name: "Ayşe Yılmaz", marketing_sms_at: null, marketing_email_at: null };

describe("randevu hatırlatma zamanı", () => {
  it("09:00 randevusuna 2 saat önce hatırlatması önceki akşam 20:05'e çekilir (İstanbul)", () => {
    const starts = new Date("2026-11-15T06:00:00Z").getTime(); // 09:00 İstanbul
    expect(new Date(appointmentSendAt(starts, 2)).toISOString()).toBe("2026-11-14T17:05:00.000Z"); // 20:05 İstanbul
  });

  it("gündüz saatine düşen hatırlatma olduğu gibi kalır", () => {
    const starts = new Date("2026-11-14T11:00:00Z").getTime(); // 14:00
    expect(appointmentSendAt(starts, 2)).toBe(starts - 2 * 3_600_000);
  });

  it("20:05'ten sonra (21:00'den önce) düşen hatırlatma da 20:05'e çekilir", () => {
    const starts = new Date("2026-11-14T19:30:00Z").getTime(); // 22:30 İstanbul
    const at = appointmentSendAt(starts, 2); // hesaplanan gönderim 20:30 İstanbul
    expect(new Date(at).toISOString()).toBe("2026-11-14T17:05:00.000Z");
  });

  it("20:05 turunda 09:00 randevusu planlanır", async () => {
    const now = new Date("2026-11-14T17:05:30Z");
    const admin = fakeAdmin({
      appointments: [
        {
          id: "a1",
          business_id: "b1",
          status: "planned",
          starts_at: "2026-11-15T06:00:00Z",
          created_at: "2026-11-10T10:00:00Z",
          customer_id: "c1",
          customers: customerRow,
        },
      ],
    });
    const out = await planRule(admin, baseRule({}), now);
    expect(out).toHaveLength(1);
    expect(out[0].scheduled_at).toBe("2026-11-14T17:05:00.000Z");
  });

  it("gönderim anından sonra oluşturulan randevuya hatırlatma gitmez", async () => {
    const now = new Date("2026-11-14T17:05:30Z");
    const admin = fakeAdmin({
      appointments: [
        {
          id: "a1",
          business_id: "b1",
          status: "planned",
          starts_at: "2026-11-15T06:00:00Z",
          created_at: "2026-11-14T17:00:00Z", // 20:00 İstanbul, 20:05 gönderim anından önce -> gider
          customer_id: "c1",
          customers: customerRow,
        },
        {
          id: "a2",
          business_id: "b1",
          status: "planned",
          starts_at: "2026-11-15T06:00:00Z",
          created_at: "2026-11-14T17:05:10Z", // gönderim anından sonra -> atlanır
          customer_id: "c2",
          customers: customerRow,
        },
      ],
    });
    const out = await planRule(admin, baseRule({}), now);
    expect(out.map((o) => o.customer_id)).toEqual(["c1"]);
  });
});

describe("borç hatırlatma", () => {
  const now = new Date("2026-11-14T08:00:00Z"); // 11:00 İstanbul
  const day = 86_400_000;

  it("ödemeleri karşılanmış satış gecikme sayılmaz", () => {
    const at = now.getTime() - 20 * day;
    expect(debtOverdueSince([{ at, amount: 1000 }], 1000, 7, now.getTime())).toBeNull();
  });

  it("ödemeler en eski satıştan düşülür; karşılanmayan ilk satış vade başlangıcıdır", () => {
    const old = now.getTime() - 30 * day;
    const newer = now.getTime() - 10 * day;
    const since = debtOverdueSince(
      [
        { at: newer, amount: 500 },
        { at: old, amount: 1000 },
      ],
      1000,
      7,
      now.getTime()
    );
    expect(since).toBe(newer + 7 * day);
  });

  it("paketsiz ödeme yapmış (bakiyesi 0) müşteriye mesaj planlanmaz", async () => {
    // Bakiyesi 0 olan müşteri customer_balances sorgusundaki balance > 0 süzgecine takılır.
    const admin = fakeAdmin({
      customer_balances: [{ business_id: "b1", customer_id: "c1", balance: 0, payments: 1000 }],
      packages: [{ business_id: "b1", customer_id: "c1", price: 1000, paid_amount: 0, purchased_at: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z" }],
      customers: [{ id: "c1", business_id: "b1", ...customerRow }],
    });
    const out = await planRule(admin, baseRule({ trigger_id: "odeme_gecikti", trigger_param: 7 }), now);
    expect(out).toEqual([]);
  });

  it("borcu 14 günlük pencere içinde gecikmeye giren müşteriye bir kez, müşteri bazlı planlanır", async () => {
    const admin = fakeAdmin({
      customer_balances: [
        { business_id: "b1", customer_id: "c1", balance: 1000, payments: 0 },
        { business_id: "b1", customer_id: "c2", balance: 1000, payments: 0 }, // çok eski: pencere dışı
      ],
      packages: [
        { business_id: "b1", customer_id: "c1", price: 1000, purchased_at: "2026-11-02T10:00:00Z", created_at: "2026-11-02T10:00:00Z" },
        { business_id: "b1", customer_id: "c1", price: 500, purchased_at: "2026-11-03T10:00:00Z", created_at: "2026-11-03T10:00:00Z" },
        { business_id: "b1", customer_id: "c2", price: 1000, purchased_at: "2026-05-01T10:00:00Z", created_at: "2026-05-01T10:00:00Z" },
      ],
      appointments: [],
      customers: [
        { id: "c1", business_id: "b1", ...customerRow },
        { id: "c2", business_id: "b1", ...customerRow },
      ],
    });
    const out = await planRule(admin, baseRule({ trigger_id: "odeme_gecikti", trigger_param: 7 }), now);
    expect(out.map((o) => o.customer_id)).toEqual(["c1"]);
    expect(out[0].scheduled_at).toBe("2026-11-09T07:00:00.000Z"); // 02 Kasım + 7 gün, 10:00 İstanbul
  });
});

describe("toplu ekleme", () => {
  it("aynı müşterinin aynı saatteki iki randevusu toplu eklemeyi düşürmez", async () => {
    const now = new Date("2026-11-14T10:05:00Z");
    const appt = (id: string) => ({
      id,
      business_id: "b1",
      status: "planned",
      starts_at: "2026-11-14T12:05:00Z",
      created_at: "2026-11-10T10:00:00Z",
      customer_id: "c1",
      customers: customerRow,
    });
    const tables = {
      appointments: [appt("a1"), appt("a2"), { ...appt("a3"), customer_id: "c2" }],
      automations: [{ id: "r1", business_id: "b1", trigger_id: "randevu_oncesi", trigger_param: 2, action_id: "sms", message: "Merhaba {ad}", wa_template: null, active: true }],
      reminders: [] as Row[],
    };
    const admin = fakeAdmin(tables);
    const { planned } = await planAutomations(admin, now);
    expect(planned).toBe(2);
    expect(admin.inserted.map((r) => r.customer_id).sort()).toEqual(["c1", "c2"]);
  });
});

describe("çalışan kural ölçütü", () => {
  it("şablon adı olmayan WhatsApp kuralı çalışmaz", () => {
    expect(isRuleRunnable({ trigger_id: "randevu_oncesi", action_id: "wa", wa_template: "  " })).toBe(false);
    expect(isRuleRunnable({ trigger_id: "randevu_oncesi", action_id: "wa", wa_template: "randevu_hatirlatma" })).toBe(true);
    expect(isRuleRunnable({ trigger_id: "randevu_oncesi", action_id: "sms" })).toBe(true);
  });

  it("e-postalı kampanya kuralı çalışmaz, e-postalı randevu hatırlatması çalışır", () => {
    expect(isRuleSupported(rule("dogum_gunu", "eposta"))).toBe(false);
    expect(isRuleSupported(rule("randevu_oncesi", "eposta"))).toBe(true);
  });
});

describe("yorum isteme", () => {
  it("yalnızca ilk ziyaret", () => {
    expect(isFirstVisit(["2026-11-14"], "2026-11-14")).toBe(true);
    expect(isFirstVisit(["2026-11-14", "2026-11-14"], "2026-11-14")).toBe(true);
    expect(isFirstVisit(["2026-10-01", "2026-11-14"], "2026-11-14")).toBe(false);
    expect(isFirstVisit([], "2026-11-14")).toBe(false);
  });

  it("yorum kuralı desteklenir", () => {
    expect(isRuleSupported(rule("randevu_tamamlandi", "sms"))).toBe(true);
  });
});
