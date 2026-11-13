import { describe, expect, it } from "vitest";

import { navSectionsForRole } from "./nav";
import { cleanModules, isModuleEnabled, moduleForPath } from "./modules";

const hrefs = (modules: string[] | null) =>
  navSectionsForRole("owner", modules).flatMap((s) => s.items.map((i) => i.href));

describe("modüller", () => {
  it("eski işletmede (null) her şey açık", () => {
    expect(isModuleEnabled(null, "stok")).toBe(true);
    expect(hrefs(null)).toEqual(expect.arrayContaining(["/paketler", "/stok", "/gorevler", "/randevu-linki"]));
  });

  it("yeni işletmede modüller kapalı başlar, çekirdek görünür", () => {
    const h = hrefs([]);
    expect(h).not.toContain("/paketler");
    expect(h).not.toContain("/stok");
    expect(h).toEqual(expect.arrayContaining(["/panel", "/takvim", "/musteriler", "/tahsilat"]));
  });

  it("açılan modül menüye gelir", () => {
    expect(hrefs(["paketler"])).toContain("/paketler");
  });

  it("alt sayfalar da modüle bağlı", () => {
    expect(moduleForPath("/stok/hareketler")).toBe("stok");
    expect(moduleForPath("/musteriler")).toBeNull();
  });

  it("bilinmeyen anahtarlar kaydedilmez", () => {
    expect(cleanModules(["stok", "bilinmeyen", "stok"])).toEqual(["stok"]);
  });
});
