import { describe, expect, it } from "vitest";

import { businessInterval, rhythmOf, type RhythmRow } from "./customer-rhythm";

const NOW = new Date("2026-11-14T09:00:00Z");

const row = (p: Partial<RhythmRow>): RhythmRow => ({
  customer_id: "c1",
  visits: 0,
  first_visit: null,
  last_visit: null,
  avg_interval_days: null,
  past_total: 0,
  no_shows: 0,
  cancels: 0,
  next_appointment: null,
  ...p,
});

describe("müşteri ritmi", () => {
  it("hiç gelmemiş müşteri 'Henüz gelmedi'", () => {
    const r = rhythmOf(row({}), NOW);
    expect(r.segment).toBe("henuz_gelmedi");
    expect(r.score).toBe(0);
  });

  it("kendi düzeninde gelen müşteri 'Güçlü' ve yüksek puanlı", () => {
    const r = rhythmOf(
      row({ visits: 10, first_visit: "2026-03-01", last_visit: "2026-11-01", avg_interval_days: 27, past_total: 10 }),
      NOW
    );
    expect(r.segment).toBe("guclu");
    expect(r.parts.duzen).toBe(40);
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("düzenine göre biraz gecikene 'İlgisi azalıyor'", () => {
    const r = rhythmOf(row({ visits: 5, first_visit: "2026-06-01", last_visit: "2026-10-01", avg_interval_days: 30, past_total: 5 }), NOW);
    expect(r.daysSinceLast).toBe(44);
    expect(r.segment).toBe("ilgisi_azaliyor");
    expect(r.overdueDays).toBe(14);
  });

  it("aynı gecikme seyrek gelen müşteride risk değildir", () => {
    const r = rhythmOf(row({ visits: 3, first_visit: "2026-02-01", last_visit: "2026-10-01", avg_interval_days: 120, past_total: 3 }), NOW);
    expect(r.segment).toBe("guclu");
  });

  it("çok uzun gelmeyene 'Kaybetme riski' ve 'Kaybedildi'", () => {
    expect(
      rhythmOf(row({ visits: 4, first_visit: "2026-05-01", last_visit: "2026-08-15", avg_interval_days: 35, past_total: 4 }), NOW).segment
    ).toBe("kaybetme_riski");
    expect(
      rhythmOf(row({ visits: 4, first_visit: "2025-12-01", last_visit: "2026-03-01", avg_interval_days: 30, past_total: 4 }), NOW).segment
    ).toBe("kaybedildi");
  });

  it("randevusu planlı müşteri risk sayılmaz", () => {
    const r = rhythmOf(
      row({ visits: 4, first_visit: "2026-01-01", last_visit: "2026-06-01", avg_interval_days: 30, past_total: 4, next_appointment: "2026-11-20T09:00:00Z" }),
      NOW
    );
    expect(r.segment).toBe("guclu");
  });

  it("tek ziyaretli müşteri işletmenin tipik aralığıyla değerlendirilir", () => {
    const yeni = rhythmOf(row({ visits: 1, first_visit: "2026-11-01", last_visit: "2026-11-01", past_total: 1 }), NOW, 30);
    expect(yeni.segment).toBe("yeni");
    expect(yeni.intervalIsOwn).toBe(false);
    const eski = rhythmOf(row({ visits: 1, first_visit: "2026-04-29", last_visit: "2026-04-29", past_total: 1 }), NOW, 38);
    expect(eski.segment).toBe("kaybedildi");
    expect(eski.overdueDays).toBe(161);
  });

  it("gelmeme ve iptal güvenilirlik puanını düşürür", () => {
    const r = rhythmOf(row({ visits: 4, first_visit: "2026-08-01", last_visit: "2026-11-01", avg_interval_days: 30, past_total: 8, no_shows: 2, cancels: 2 }), NOW);
    expect(r.parts.guvenilirlik).toBe(13);
  });
});

describe("işletme aralığı", () => {
  it("en az iki kez gelenlerin ortalama aralıklarının medyanı", () => {
    expect(
      businessInterval([
        { visits: 3, avg_interval_days: 20 },
        { visits: 5, avg_interval_days: 30 },
        { visits: 2, avg_interval_days: "60.0" },
        { visits: 1, avg_interval_days: null },
      ])
    ).toBe(30);
  });

  it("veri yoksa varsayılan 42 gün", () => {
    expect(businessInterval([])).toBe(42);
  });
});
