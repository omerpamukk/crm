import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NAV_ITEMS, navSectionsForRole } from "./nav";

const hrefsFor = (role: Parameters<typeof navSectionsForRole>[0]) =>
  navSectionsForRole(role).flatMap((s) => s.items.map((i) => i.href));

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
    for (const href of ["/mesajlar", "/eposta-sms", "/yorumlar"]) {
      expect(hrefs).not.toContain(href);
    }
  });

  // Menüden gizlemek tek başına koruma değil: yetkili öğenin sayfası da
  // aynı yetenekle requireCapability çağırmalı.
  it.each(NAV_ITEMS.filter((i) => i.cap))("$href sayfası menüyle aynı kapıyı kullanır", (item) => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(dashboard)", item.href, "page.tsx"),
      "utf8"
    );
    expect(page).toContain(`requireCapability("${item.cap}")`);
  });
});
