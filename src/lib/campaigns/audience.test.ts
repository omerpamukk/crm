import { describe, expect, it } from "vitest";

import type { RhythmRow } from "@/lib/customer-rhythm";

import { buildAudience, personalize, smsParts, type AudienceCustomer } from "./audience";

const NOW = new Date("2026-11-14T10:00:00Z");
const OK = "2026-01-01T00:00:00Z";

const cust = (id: string, over: Partial<AudienceCustomer> = {}): AudienceCustomer => ({
  id,
  full_name: `Kişi ${id}`,
  phone: `0532 000 00 ${id.padStart(2, "0")}`,
  birthday: null,
  marketing_sms_at: OK,
  ...over,
});

const row = (id: string, last: string | null, next: string | null = null): RhythmRow => ({
  customer_id: id,
  visits: last ? 3 : 0,
  first_visit: last ? "2026-01-01" : null,
  last_visit: last,
  avg_interval_days: last ? 30 : null,
  past_total: last ? 3 : 0,
  no_shows: 0,
  cancels: 0,
  next_appointment: next,
});

describe("kampanya kitlesi", () => {
  it("izinsiz ve telefonsuz kişiye gitmez", () => {
    const r = buildAudience(
      "hepsi",
      [cust("1"), cust("2", { marketing_sms_at: null }), cust("3", { phone: null }), cust("4", { phone: "123" })],
      [],
      NOW
    );
    expect(r.recipients.map((x) => x.customerId)).toEqual(["1"]);
    expect(r.noConsent).toBe(1);
    expect(r.noPhone).toBe(2);
  });

  it("aynı numaraya iki kez gitmez", () => {
    const r = buildAudience("hepsi", [cust("1"), cust("2", { phone: "0532 000 00 01" })], [], NOW);
    expect(r.recipients).toHaveLength(1);
  });

  it("1 aydır gelmeyen: 30 günü geçmiş, ileri randevusu yok", () => {
    const r = buildAudience(
      "gelmeyen_30",
      [cust("1"), cust("2"), cust("3"), cust("4")],
      [row("1", "2026-10-01"), row("2", "2026-11-01"), row("3", "2026-09-01", "2026-11-20T09:00:00Z"), row("4", null)],
      NOW
    );
    expect(r.recipients.map((x) => x.customerId)).toEqual(["1"]);
  });

  it("bu ay doğum günü olanlar", () => {
    const r = buildAudience(
      "dogum_gunu",
      [cust("1", { birthday: "1990-11-30" }), cust("2", { birthday: "1990-12-01" }), cust("3")],
      [],
      NOW
    );
    expect(r.recipients.map((x) => x.customerId)).toEqual(["1"]);
  });

  it("numara uluslararası biçime çevrilir", () => {
    const r = buildAudience("hepsi", [cust("7")], [], NOW);
    expect(r.recipients[0].phone).toBe("905320000007");
  });
});

describe("mesaj", () => {
  it("{ad} müşterinin ilk adıyla dolar", () => {
    expect(personalize("Merhaba {ad}, {AD}!", "Ayşe Nur Yılmaz")).toBe("Merhaba Ayşe, Ayşe!");
  });

  it("SMS boyu", () => {
    expect(smsParts("")).toBe(0);
    expect(smsParts("a".repeat(155))).toBe(1);
    expect(smsParts("a".repeat(156))).toBe(2);
    expect(smsParts("a".repeat(301))).toBe(3);
  });
});

describe("excel kitlesi", () => {
  it("son 7 günde Excel'den yüklenenler", () => {
    const r = buildAudience(
      "excel",
      [
        cust("1", { source: "Excel", created_at: "2026-11-13T10:00:00Z" }),
        cust("2", { source: "Excel", created_at: "2026-10-01T10:00:00Z" }),
        cust("3", { source: "Instagram", created_at: "2026-11-13T10:00:00Z" }),
      ],
      [],
      NOW
    );
    expect(r.recipients.map((x) => x.customerId)).toEqual(["1"]);
  });
});
