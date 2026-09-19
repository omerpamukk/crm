import { describe, it, expect } from "vitest";

import { can, assertCan, ROLE_LABEL, type Capability } from "./permissions";

describe("rol yetki matrisi", () => {
  it("yönetici tüm yetkilere sahip", () => {
    const caps: Capability[] = [
      "finans", "raporlar", "ayarlar", "personel_yonet",
      "musteri_yonet", "randevu_yonet", "tahsilat", "tum_randevular",
    ];
    for (const c of caps) {
      expect(can("owner", c), `owner → ${c}`).toBe(true);
    }
  });

  it("resepsiyon finansal veriyi göremez", () => {
    // Denetimde bulunan asıl sorun: personel tüm ciroyu görebiliyordu.
    expect(can("reception", "finans")).toBe(false);
    expect(can("reception", "raporlar")).toBe(false);
    expect(can("reception", "ayarlar")).toBe(false);
    expect(can("reception", "personel_yonet")).toBe(false);
  });

  it("resepsiyon günlük operasyonu yapabilir", () => {
    expect(can("reception", "musteri_yonet")).toBe(true);
    expect(can("reception", "randevu_yonet")).toBe(true);
    expect(can("reception", "tahsilat")).toBe(true);
  });

  it("uzman yalnızca kendi işini görür", () => {
    expect(can("specialist", "finans")).toBe(false);
    expect(can("specialist", "raporlar")).toBe(false);
    expect(can("specialist", "tum_randevular")).toBe(false);
    expect(can("specialist", "tahsilat")).toBe(false);
  });

  it("rolü olmayan hiçbir şey yapamaz", () => {
    expect(can(null, "musteri_yonet")).toBe(false);
    expect(can(undefined, "finans")).toBe(false);
  });

  it("assertCan yetkisizde fırlatır", () => {
    expect(() => assertCan("owner", "finans")).not.toThrow();
    expect(() => assertCan("reception", "finans")).toThrow();
    expect(() => assertCan(null, "finans")).toThrow();
  });

  it("her rolün Türkçe etiketi var", () => {
    expect(ROLE_LABEL.owner).toBe("Yönetici");
    expect(ROLE_LABEL.reception).toBe("Resepsiyon");
    expect(ROLE_LABEL.specialist).toBe("Uzman");
  });
});
