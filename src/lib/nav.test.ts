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
    for (const href of ["/mesajlar"]) {
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

describe("menü düzeni", () => {
  it("kategoriler birleşmez: Ana Menü · Satış · Büyüme · Yönetim", () => {
    const sections = navSectionsForRole("owner", null);
    expect(sections.map((s) => s.label)).toEqual(["Ana Menü", "Satış", "Büyüme", "Yönetim"]);
    expect(sections[0].items.map((i) => i.label)).toEqual(["Genel Bakış", "Randevular", "Müşteriler", "Görevler"]);
  });

  it("yalnızca Randevular ve Satışlar sekmeli (kullanıcı kararı)", () => {
    const items = navSectionsForRole("owner", null).flatMap((s) => s.items);
    expect(items.filter((i) => i.tabs).map((i) => i.label)).toEqual(["Randevular", "Satışlar"]);
    expect(items.find((i) => i.label === "Randevular")?.tabs?.map((t) => t.href)).toEqual(["/takvim", "/randevular"]);
    expect(items.find((i) => i.label === "Satışlar")?.tabs?.map((t) => t.href)).toEqual(["/tahsilat", "/cari"]);
  });

  it("kapalı modülün sayfası menüden düşer; sekmesi kalan öğe durur", () => {
    const hrefs = navPagesForRole("owner", ["kampanyalar", "v2"]).map((p) => p.href);
    expect(hrefs).toContain("/kampanyalar");
    expect(hrefs).not.toContain("/cari");
    expect(hrefs).not.toContain("/leadler");
    const items = navSectionsForRole("owner", ["kampanyalar", "v2"]).flatMap((s) => s.items);
    expect(items.find((i) => i.label === "Satışlar")?.tabs?.map((t) => t.href)).toEqual(["/tahsilat"]);
  });

  it("sekme sayfasında öğe etkin görünür", () => {
    const items = navSectionsForRole("owner", null).flatMap((s) => s.items);
    expect(itemForPath("/cari/123", [{ key: "x", label: "x", icon: items[0].icon, items }])?.label).toBe("Satışlar");
  });
});
