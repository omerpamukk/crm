import { describe, expect, it } from "vitest";

import { countVisits, loyaltyProgress, loyaltySentence, readLoyalty } from "./loyalty";

const NOW = new Date("2026-11-14T12:00:00Z");

describe("sadakat kartı", () => {
  it("aynı gün tek ziyaret; iptal ve gelmedi sayılmaz; gelecek sayılmaz", () => {
    const n = countVisits(
      [
        { starts_at: "2026-11-01T07:00:00Z", status: "completed" },
        { starts_at: "2026-11-01T09:00:00Z", status: "completed" },
        { starts_at: "2026-11-05T07:00:00Z", status: "cancelled" },
        { starts_at: "2026-11-06T07:00:00Z", status: "no_show" },
        { starts_at: "2026-11-10T07:00:00Z", status: null },
        { starts_at: "2026-11-20T07:00:00Z", status: "planned" },
      ],
      null,
      NOW
    );
    expect(n).toBe(2);
  });

  it("sayaç son hediyeden sonra başlar", () => {
    const visits = [
      { starts_at: "2026-10-01T07:00:00Z", status: "completed" },
      { starts_at: "2026-11-02T07:00:00Z", status: "completed" },
    ];
    expect(countVisits(visits, "2026-10-15T00:00:00Z", NOW)).toBe(1);
  });

  it("ilerleme ve cümle", () => {
    expect(loyaltyProgress(7, 10)).toEqual({ count: 7, target: 10, remaining: 3, eligible: false });
    expect(loyaltyProgress(12, 10)).toEqual({ count: 10, target: 10, remaining: 0, eligible: true });
    expect(loyaltySentence(loyaltyProgress(10, 10), "Ücretsiz fön")).toBe("Hediye hakkı var: Ücretsiz fön");
    expect(loyaltySentence(loyaltyProgress(8, 10), null)).toBe("2 ziyaret sonra hediye");
  });

  it("ayar yoksa kapalı", () => {
    expect(readLoyalty(null)).toBeNull();
    expect(readLoyalty({ loyalty_target: null })).toBeNull();
    expect(readLoyalty({ loyalty_target: 10, loyalty_reward: "Fön", loyalty_notify_before: 2 })).toEqual({
      target: 10,
      reward: "Fön",
      notifyBefore: 2,
    });
  });
});

describe("sadakat SMS'i", () => {
  it("metin", async () => {
    const { nudgeText } = await import("./loyalty-nudge");
    expect(nudgeText("Ayşe", 2, "ücretsiz fön", "Defne Güzellik")).toBe("Merhaba Ayşe, 2 ziyaret sonra ücretsiz fön sizin! Görüşmek üzere. Defne Güzellik");
  });
});
