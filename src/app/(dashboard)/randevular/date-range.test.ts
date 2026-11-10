import { describe, it, expect } from "vitest";

import { parseDateKey, resolveRange, shiftAnchor, toDateKey } from "./date-range";

const today = new Date("2026-11-05T11:30:00.000Z"); // İstanbul: 5 Kasım 2026 14:30, Perşembe

describe("resolveRange", () => {
  it("gün: bugünü kapsar, ertesi gün hariç", () => {
    const r = resolveRange("gun", null, null, null, today);
    expect(toDateKey(r.start)).toBe("2026-11-05");
    expect(toDateKey(r.end)).toBe("2026-11-06");
    expect(r.includesToday).toBe(true);
  });

  it("hafta: Pazartesi'den başlar", () => {
    const r = resolveRange("hafta", null, null, null, today);
    expect(toDateKey(r.start)).toBe("2026-11-02");
    expect(toDateKey(r.end)).toBe("2026-11-09");
  });

  it("ay: ayın ilk günü ile sonraki ayın ilk günü arası", () => {
    const r = resolveRange("ay", "2026-02-17", null, null, today);
    expect(toDateKey(r.start)).toBe("2026-02-01");
    expect(toDateKey(r.end)).toBe("2026-03-01");
    expect(r.includesToday).toBe(false);
  });

  it("özel: bitiş günü dahil, ters girilse de düzeltir", () => {
    const r = resolveRange("ozel", null, "2026-11-10", "2026-11-03", today);
    expect(toDateKey(r.start)).toBe("2026-11-03");
    expect(toDateKey(r.end)).toBe("2026-11-11");
  });
});

describe("shiftAnchor", () => {
  it("gün, hafta ve ay adımlarıyla ilerler", () => {
    expect(shiftAnchor("gun", "2026-11-05", 1, today)).toBe("2026-11-06");
    expect(shiftAnchor("hafta", "2026-11-05", -1, today)).toBe("2026-10-29");
    expect(shiftAnchor("ay", "2026-12-20", 1, today)).toBe("2027-01-01");
  });
});

describe("parseDateKey", () => {
  it("geçersiz tarihi reddeder", () => {
    expect(parseDateKey("2026-02-31")).toBeNull();
    expect(parseDateKey("abc")).toBeNull();
    expect(parseDateKey(null)).toBeNull();
  });
});

describe("saat dilimi", () => {
  it("gün sınırı İstanbul gece yarısıdır (UTC+3)", () => {
    const r = resolveRange("gun", null, null, null, today);
    expect(r.start.toISOString()).toBe("2026-11-04T21:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-11-05T21:00:00.000Z");
  });

  it("UTC'de gece yarısından sonra İstanbul günü ilerlemiştir", () => {
    const lateUtc = new Date("2026-11-04T22:30:00.000Z"); // İstanbul: 5 Kasım 01:30
    expect(toDateKey(lateUtc)).toBe("2026-11-05");
    expect(resolveRange("gun", null, null, null, lateUtc).includesToday).toBe(true);
  });
});
