import { describe, expect, it } from "vitest";

import { isStaffColor, nextStaffColor, staffDoesService, staffDotClass } from "./staff-colors";

describe("staff-colors", () => {
  it("bilinmeyen renk gri nokta", () => {
    expect(staffDotClass(null)).toBe("bg-label-3");
    expect(staffDotClass("yesil")).toBe("bg-staff-yesil");
    expect(isStaffColor("kirmizi")).toBe(false);
  });
  it("sıradaki boş renk", () => {
    expect(nextStaffColor([])).toBe("indigo");
    expect(nextStaffColor(["indigo", "mavi"])).toBe("turkuaz");
  });
  it("boş hizmet listesi = tüm hizmetler", () => {
    expect(staffDoesService([], "a")).toBe(true);
    expect(staffDoesService(["a"], "a")).toBe(true);
    expect(staffDoesService(["a"], "b")).toBe(false);
    expect(staffDoesService(["a"], null)).toBe(true);
  });
});
