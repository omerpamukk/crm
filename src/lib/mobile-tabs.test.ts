import { describe, expect, it } from "vitest";

import { mobileTabsForRole, navSectionsForRole } from "./nav";

const hrefs = (role: Parameters<typeof mobileTabsForRole>[0]) => mobileTabsForRole(role).map((t) => t.href);

describe("telefon sekme çubuğu", () => {
  it("her rolde Genel Bakış, Takvim, Müşteriler (Menü ayrıca)", () => {
    for (const role of ["owner", "reception", "specialist"] as const) {
      expect(hrefs(role)).toEqual(["/panel", "/takvim", "/musteriler"]);
    }
  });

  it("sekmeler rolün menüsünde olmayan sayfa içermez", () => {
    for (const role of ["owner", "reception", "specialist"] as const) {
      const allowed = navSectionsForRole(role).flatMap((s) => s.items.map((i) => i.href));
      for (const href of hrefs(role)) expect(allowed).toContain(href);
    }
  });
});
