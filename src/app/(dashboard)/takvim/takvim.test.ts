import { describe, expect, it } from "vitest";

import {
  addMonths,
  dayKeyOf,
  dayTitle,
  hhmm,
  isDayKey,
  minuteOfDay,
  monthWeeks,
  parseHHMM,
  rangeTitle,
  stepDate,
  visibleRange,
  weekdayOf,
  zonedToUtc,
} from "./zaman";
import { safeTimeZone } from "@/lib/zaman";
import { hourBounds, offIntervals, packOverlaps } from "./yerlesim";

const TZ = "Europe/Istanbul";

describe("saat dilimi", () => {
  it("işletme saatindeki günü ve dakikayı verir (UTC+3)", () => {
    const iso = "2026-11-04T22:30:00.000Z"; // İstanbul: 5 Kasım 01:30
    expect(dayKeyOf(iso, TZ)).toBe("2026-11-05");
    expect(minuteOfDay(iso, TZ)).toBe(90);
  });

  it("duvar saatini gerçek ana çevirir", () => {
    expect(new Date(zonedToUtc("2026-11-05", 0, TZ)).toISOString()).toBe("2026-11-04T21:00:00.000Z");
    expect(new Date(zonedToUtc("2026-11-05", 14 * 60 + 30, TZ)).toISOString()).toBe("2026-11-05T11:30:00.000Z");
  });

  it("yaz saati olan dilimde de doğru çevirir", () => {
    // Berlin 29 Mart 2026'da 02:00 → 03:00 (UTC+2)
    expect(new Date(zonedToUtc("2026-03-30", 9 * 60, "Europe/Berlin")).toISOString()).toBe("2026-03-30T07:00:00.000Z");
    expect(new Date(zonedToUtc("2026-03-28", 9 * 60, "Europe/Berlin")).toISOString()).toBe("2026-03-28T08:00:00.000Z");
  });

  it("geçersiz dilim varsayılana döner", () => {
    expect(safeTimeZone("Mars/Olympus")).toBe("Europe/Istanbul");
    expect(safeTimeZone(null)).toBe("Europe/Istanbul");
    expect(safeTimeZone("Europe/London")).toBe("Europe/London");
  });
});

describe("gün anahtarı", () => {
  it("geçerli tarihi tanır", () => {
    expect(isDayKey("2026-11-05")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("5-11-2026")).toBe(false);
    expect(isDayKey(null)).toBe(false);
  });

  it("haftanın gününü Pazartesi = 1 sayar", () => {
    expect(weekdayOf("2026-11-02")).toBe(1);
    expect(weekdayOf("2026-11-08")).toBe(7);
  });

  it("ay eklerken günü ayın sonuna sığdırır", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("saat metnini çözer ve yazar", () => {
    expect(parseHHMM("09:30")).toBe(570);
    expect(parseHHMM("9:05:00")).toBe(545);
    expect(parseHHMM("abc")).toBeNull();
    expect(hhmm(570)).toBe("09:30");
  });
});

describe("görünüm aralığı", () => {
  it("hafta Pazartesi–Pazar", () => {
    expect(visibleRange("hafta", "2026-11-05")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
  });

  it("ay tam haftalardan oluşur", () => {
    const r = visibleRange("ay", "2026-11-05");
    expect(r).toEqual({ start: "2026-10-26", end: "2026-12-06" });
    const weeks = monthWeeks("2026-11-05");
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // Şubat 2027: Pazartesi başlar, 4 hafta
    expect(monthWeeks("2027-02-10")).toHaveLength(4);
  });

  it("adım görünüme göre", () => {
    expect(stepDate("gun", "2026-11-05", 1)).toBe("2026-11-06");
    expect(stepDate("hafta", "2026-11-05", -1)).toBe("2026-10-29");
    expect(stepDate("ay", "2026-11-05", 1)).toBe("2026-12-05");
  });

  it("başlıklar", () => {
    expect(dayTitle("2026-11-05", "2026-11-05")).toBe("5 Kasım Perşembe");
    expect(dayTitle("2025-11-05", "2026-11-05", true)).toBe("5 Kas 2025 Çar");
    expect(rangeTitle("hafta", "2026-11-05", "2026-11-05")).toBe("2–8 Kasım 2026");
    expect(rangeTitle("hafta", "2026-11-05", "2026-11-05", true)).toBe("2–8 Kas");
    expect(rangeTitle("hafta", "2026-10-28", "2026-11-05")).toBe("26 Ekim – 1 Kasım 2026");
    expect(rangeTitle("hafta", "2026-12-30", "2026-11-05", true)).toBe("28 Ara – 3 Oca");
    expect(rangeTitle("ay", "2026-11-05", "2026-11-05")).toBe("Kasım 2026");
  });
});

describe("çakışma yerleşimi", () => {
  it("çakışmayanlar tam genişlik", () => {
    const r = packOverlaps([
      { id: "a", start: 600, end: 660 },
      { id: "b", start: 660, end: 720 },
    ]);
    expect(r.get("a")).toEqual({ col: 0, cols: 1, span: 1 });
    expect(r.get("b")).toEqual({ col: 0, cols: 1, span: 1 });
  });

  it("çakışanlar yan yana, boş sütuna yayılır", () => {
    const r = packOverlaps([
      { id: "a", start: 600, end: 720 },
      { id: "b", start: 600, end: 630 },
      { id: "c", start: 615, end: 660 },
      { id: "d", start: 640, end: 700 },
    ]);
    expect(r.get("a")).toEqual({ col: 0, cols: 3, span: 1 });
    expect(r.get("b")).toEqual({ col: 1, cols: 3, span: 1 });
    expect(r.get("c")).toEqual({ col: 2, cols: 3, span: 1 });
    // d, b'nin bıraktığı sütuna oturur; sağı (c) 660'ta boşalmadığı için yayılmaz
    expect(r.get("d")).toEqual({ col: 1, cols: 3, span: 1 });
  });

  it("sağındaki sütun boşsa yayılır", () => {
    const r = packOverlaps([
      { id: "a", start: 600, end: 700 },
      { id: "b", start: 600, end: 630 },
      { id: "c", start: 600, end: 620 },
      { id: "d", start: 640, end: 690 },
    ]);
    expect(r.get("d")).toEqual({ col: 1, cols: 3, span: 2 });
  });
});

describe("saat aralığı ve mesai dışı", () => {
  it("bilgi yoksa 09–18", () => {
    expect(hourBounds([], [])).toEqual([9, 18]);
  });

  it("mesai ve randevuları kapsar, saat başına yuvarlar", () => {
    expect(hourBounds([{ start: 570, end: 1080 }], [{ start: 1110, end: 1170 }])).toEqual([9, 20]);
  });

  it("mesai bilgisi yoksa 09–18 taban, randevu dışarı taşarsa genişler", () => {
    expect(hourBounds([], [{ start: 946, end: 1006 }])).toEqual([9, 18]);
    expect(hourBounds([], [{ start: 180, end: 240 }])).toEqual([3, 18]);
  });

  it("en az dört saat", () => {
    expect(hourBounds([{ start: 600, end: 660 }], [])).toEqual([10, 14]);
    expect(hourBounds([{ start: 1400, end: 1430 }], [])).toEqual([20, 24]);
  });

  it("mesai dışını ve izni verir", () => {
    expect(offIntervals({ start: 600, end: 1080 }, 540, 1200)).toEqual([
      [540, 600],
      [1080, 1200],
    ]);
    expect(offIntervals(null, 540, 1200)).toEqual([[540, 1200]]);
    expect(offIntervals(undefined, 540, 1200, [[700, 760]])).toEqual([[700, 760]]);
  });
});
