import { afterEach, describe, expect, it } from "vitest";

import { fromDateTimeLocal, toDateTimeLocal, zonedWallToUtcMs } from "./zaman";
import { formatDate, formatDateTime, formatTime } from "./format";

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe("fromDateTimeLocal", () => {
  it("ofsetsiz yerel saati İstanbul olarak yorumlar (+03:00)", () => {
    expect(fromDateTimeLocal("2026-11-05T14:00")).toBe("2026-11-05T11:00:00.000Z");
    expect(fromDateTimeLocal("2026-07-01T09:30")).toBe("2026-07-01T06:30:00.000Z");
  });

  it("gece yarısı ve gün sınırını doğru çevirir", () => {
    expect(fromDateTimeLocal("2026-11-05T00:00")).toBe("2026-11-04T21:00:00.000Z");
    expect(fromDateTimeLocal("2026-11-05T23:59")).toBe("2026-11-05T20:59:00.000Z");
  });

  it("sunucunun saat diliminden bağımsızdır", () => {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      expect(fromDateTimeLocal("2026-11-05T14:00")).toBe("2026-11-05T11:00:00.000Z");
    }
  });

  it("zaten ofsetli değeri an olarak korur", () => {
    expect(fromDateTimeLocal("2026-11-05T11:00:00.000Z")).toBe("2026-11-05T11:00:00.000Z");
    expect(fromDateTimeLocal("2026-11-05T14:00:00+03:00")).toBe("2026-11-05T11:00:00.000Z");
  });

  it("geçersiz değerde null döner", () => {
    expect(fromDateTimeLocal("")).toBeNull();
    expect(fromDateTimeLocal(null)).toBeNull();
    expect(fromDateTimeLocal("yarın 14:00")).toBeNull();
    expect(fromDateTimeLocal("2026-02-31T10:00")).toBeNull();
    expect(fromDateTimeLocal("2026-13-01T10:00")).toBeNull();
    expect(fromDateTimeLocal("2026-11-05T25:00")).toBeNull();
  });

  it("farklı dilimi (yaz saati olan) doğru işler", () => {
    // New York, 2026-07-01 12:00 = UTC-4
    expect(fromDateTimeLocal("2026-07-01T12:00", "America/New_York")).toBe("2026-07-01T16:00:00.000Z");
    // 2026-03-08 02:30 New York'ta yok (ileri geçiş boşluğu)
    expect(fromDateTimeLocal("2026-03-08T02:30", "America/New_York")).toBeNull();
  });
});

describe("toDateTimeLocal", () => {
  it("saklanan anı İstanbul yerel saatine çevirir", () => {
    expect(toDateTimeLocal("2026-11-05T11:00:00+00:00")).toBe("2026-11-05T14:00");
    expect(toDateTimeLocal("2026-11-05T21:30:00Z")).toBe("2026-11-06T00:30");
  });

  it("gidiş-dönüş değeri korur", () => {
    for (const local of ["2026-11-05T14:00", "2026-01-01T00:00", "2026-12-31T23:45", "2030-06-15T09:05"]) {
      const iso = fromDateTimeLocal(local);
      expect(iso).not.toBeNull();
      expect(toDateTimeLocal(iso)).toBe(local);
    }
  });

  it("sunucu/tarayıcı diliminden bağımsızdır", () => {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      expect(toDateTimeLocal("2026-11-05T11:00:00Z")).toBe("2026-11-05T14:00");
    }
  });

  it("yalnızca-tarih değerini kaydırmaz", () => {
    expect(toDateTimeLocal("2026-11-05")).toBe("2026-11-05T00:00");
    expect(toDateTimeLocal("2026-11-05").slice(0, 10)).toBe("2026-11-05");
  });

  it("boş ve geçersiz değerde boş metin döner", () => {
    expect(toDateTimeLocal(null)).toBe("");
    expect(toDateTimeLocal("")).toBe("");
    expect(toDateTimeLocal("bozuk")).toBe("");
  });
});

describe("zonedWallToUtcMs", () => {
  it("İstanbul için +3 saat geri alır", () => {
    expect(new Date(zonedWallToUtcMs(2026, 11, 5, 14, 0)).toISOString()).toBe("2026-11-05T11:00:00.000Z");
  });
});

describe("formatTime / formatDateTime / formatDate", () => {
  it("UTC ortamında (Vercel) İstanbul saatini verir", () => {
    process.env.TZ = "UTC";
    expect(formatTime("2026-11-05T11:00:00Z")).toBe("14:00");
    expect(formatDateTime("2026-11-05T11:00:00Z")).toContain("14:00");
    expect(formatDateTime("2026-11-05T11:00:00Z")).toContain("5.11.2026");
  });

  it("tarayıcı dilimi ne olursa olsun aynı metni verir", () => {
    const out = new Set<string>();
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo", "Europe/Istanbul"]) {
      process.env.TZ = tz;
      out.add(formatTime("2026-11-05T11:00:00Z") + "|" + formatDateTime("2026-11-05T11:00:00Z"));
    }
    expect(out.size).toBe(1);
  });

  it("gece yarısına yakın anı İstanbul gününe yazar", () => {
    process.env.TZ = "UTC";
    // 21:30Z = ertesi gün 00:30 İstanbul
    expect(formatTime("2026-11-05T21:30:00Z")).toBe("00:30");
    expect(formatDate("2026-11-05T21:30:00Z")).toBe("06.11.2026");
  });

  it("yalnızca-tarih değerleri hiçbir ortamda kaymaz", () => {
    for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      expect(formatDate("2026-11-05")).toBe("05.11.2026");
      expect(formatDate("2026-01-01")).toBe("01.01.2026");
    }
  });

  it("boş ve geçersiz değerde çizgi döner", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatDate("bozuk")).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
});
