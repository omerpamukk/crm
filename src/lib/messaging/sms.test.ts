import { describe, it, expect } from "vitest";

import { normalizePhone } from "./sms";

describe("telefon normalizasyonu", () => {
  it("yaygın Türkiye biçimlerini 90XXXXXXXXXX'e çevirir", () => {
    expect(normalizePhone("5321234567")).toBe("905321234567");
    expect(normalizePhone("05321234567")).toBe("905321234567");
    expect(normalizePhone("905321234567")).toBe("905321234567");
    expect(normalizePhone("+90 532 123 45 67")).toBe("905321234567");
    expect(normalizePhone("0532 123 45 67")).toBe("905321234567");
    expect(normalizePhone("(0532) 123-45-67")).toBe("905321234567");
  });

  it("geçersiz numaralara null döner", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("abcdefghij")).toBeNull();
    // Sabit hat mobil değil — 5 ile başlamıyor
    expect(normalizePhone("2121234567")).toBeNull();
  });
});
