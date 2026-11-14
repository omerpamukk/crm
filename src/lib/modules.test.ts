import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { navSectionsForRole } from "./nav";
import {
  MODULE_OF_PATH,
  VERSION_MARK,
  cleanModules,
  enabledModuleKeys,
  isModuleEnabled,
  moduleForPath,
  presetForSector,
} from "./modules";

const hrefs = (modules: string[] | null) =>
  navSectionsForRole("owner", modules).flatMap((s) => s.items.map((i) => i.href));

describe("modüller", () => {
  it("eski işletmede (null) her şey açık", () => {
    expect(isModuleEnabled(null, "stok")).toBe(true);
    expect(hrefs(null)).toEqual(expect.arrayContaining(["/paketler", "/stok", "/gorevler", "/randevu-linki", "/leadler", "/kampanyalar"]));
  });

  it("yeni sürüm boş liste: yalnızca çekirdek görünür", () => {
    const h = hrefs([VERSION_MARK]);
    for (const href of ["/paketler", "/stok", "/leadler", "/firsatlar", "/cari", "/giderler", "/kampanyalar"]) {
      expect(h).not.toContain(href);
    }
    expect(h).toEqual(expect.arrayContaining(["/panel", "/takvim", "/musteriler", "/tahsilat", "/raporlar", "/hizmetler"]));
  });

  it("ilk sürümde kaydedilmiş liste eski çekirdeği korur", () => {
    const h = hrefs(["paketler"]);
    expect(h).toEqual(expect.arrayContaining(["/paketler", "/leadler", "/firsatlar", "/cari", "/giderler", "/hatirlaticilar"]));
    expect(h).not.toContain("/stok");
    expect(h).not.toContain("/kampanyalar");
  });

  it("açılan modül menüye gelir", () => {
    expect(hrefs(["leadler", VERSION_MARK])).toContain("/leadler");
  });

  it("alt sayfalar da modüle bağlı", () => {
    expect(moduleForPath("/stok/hareketler")).toBe("stok");
    expect(moduleForPath("/musteriler")).toBeNull();
  });

  it("kaydedilen liste temiz ve işaretli", () => {
    expect(cleanModules(["stok", "bilinmeyen", "stok"])).toEqual(["stok", VERSION_MARK]);
    expect(enabledModuleKeys(cleanModules([]))).toEqual([]);
  });

  it("sektör ön ayarı: klinikte lead var, kuaförde yok", () => {
    expect(presetForSector("klinik")).toContain("leadler");
    expect(presetForSector("kuafor")).not.toContain("leadler");
    expect(presetForSector("guzellik_salonu")).not.toContain("leadler");
    expect(presetForSector("bilinmeyen")).toContain("kampanyalar");
  });
});

describe("modül sayfaları", () => {
  it.each(Object.entries(MODULE_OF_PATH))("%s sayfası URL ile de kapalı", (href, key) => {
    const page = readFileSync(join(process.cwd(), "src/app/(dashboard)", href, "page.tsx"), "utf8");
    expect(page).toContain(`requireModule("${key}")`);
  });
});
