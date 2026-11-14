import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NAV_PAGES, itemForPath, navPagesForRole, navSectionsForRole } from "./nav";

const hrefsFor = (role: Parameters<typeof navSectionsForRole>[0]) =>
  navPagesForRole(role).map((p) => p.href);

describe("menü", () => {
  it("uzman yalnızca kendi iş sayfalarını görür", () => {
    expect(hrefsFor("specialist")).toEqual([
      "/panel",
      "/takvim",
      "/randevular",
      "/musteriler",
      "/gorevler",
    ]);
  });

  it("resepsiyon finans ve yönetici sayfalarını görmez", () => {
    const hrefs = hrefsFor("reception");
    for (const href of ["/raporlar", "/giderler", "/personel"]) {
      expect(hrefs).not.toContain(href);
    }
    expect(hrefs).toContain("/tahsilat");
  });

  it("demo sayfalar menüde yok", () => {
    const hrefs = hrefsFor("owner");
    for (const href of ["/mesajlar", "/yorumlar"]) {
      expect(hrefs).not.toContain(href);
    }
  });

  // Menüden gizlemek tek başına koruma değil: yetkili öğenin sayfası da
  // aynı yetenekle requireCapability çağırmalı.
  it.each(NAV_PAGES.filter((i) => i.cap))("$href sayfası menüyle aynı kapıyı kullanır", (item) => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(dashboard)", item.href, "page.tsx"),
      "utf8"
    );
    expect(page).toContain(`requireCapability("${item.cap}")`);
  });
});

describe("giriş koruması", () => {
  it("menüdeki her sayfa girişsiz açılmaz", () => {
    const mw = readFileSync(join(process.cwd(), "src/middleware.ts"), "utf8");
    for (const item of NAV_PAGES) expect(mw).toContain(`"${item.href}"`);
  });
});

describe("gruplu menü", () => {
  it("ana menü yedi başlık", () => {
    const main = navSectionsForRole("owner", null)[0];
    expect(main.items.map((i) => i.label)).toEqual([
      "Genel Bakış", "Randevular", "Müşteriler", "Satışlar", "Pazarlama", "Raporlar", "İşletme",
    ]);
  });

  it("öğe, rolün açabildiği ilk sekmeye gider", () => {
    const items = navSectionsForRole("reception", null).flatMap((s) => s.items);
    expect(items.find((i) => i.label === "İşletme")?.href).toBe("/hizmetler");
    expect(items.find((i) => i.label === "İşletme")?.tabs?.map((t) => t.href)).toEqual(["/hizmetler", "/randevu-linki"]);
    expect(items.find((i) => i.label === "Raporlar")).toBeUndefined();
  });

  it("kapalı modülün sekmesi çıkmaz; ilk sekme kapalıysa öğe sonrakine gider", () => {
    const items = navSectionsForRole("owner", ["kampanyalar", "v2"]).flatMap((s) => s.items);
    const p = items.find((i) => i.label === "Pazarlama");
    expect(p?.href).toBe("/kampanyalar");
    expect(p?.tabs).toHaveLength(1);
  });

  it("sekme sayfasında öğe etkin görünür", () => {
    const items = navSectionsForRole("owner", null).flatMap((s) => s.items);
    expect(itemForPath("/cari/123", [{ key: "x", label: "x", icon: items[0].icon, items }])?.label).toBe("Satışlar");
  });
});
