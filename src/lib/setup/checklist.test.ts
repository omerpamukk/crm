import { describe, expect, it } from "vitest";

import { setupSteps } from "./checklist";

const base = { hasHours: false, services: 0, staff: 0, customers: 0, smsConnected: false, bookingModule: true, bookingActive: false };

describe("kurulum adımları", () => {
  it("boş işletmede hiçbiri tamam değil", () => {
    const s = setupSteps(base);
    expect(s).toHaveLength(6);
    expect(s.every((x) => !x.done)).toBe(true);
  });

  it("randevu modülü kapalıysa adım yok", () => {
    expect(setupSteps({ ...base, bookingModule: false }).map((x) => x.key)).not.toContain("randevu");
  });

  it("dolu alanlar tamam sayılır", () => {
    const s = setupSteps({ ...base, hasHours: true, services: 3, staff: 1, customers: 10, smsConnected: true, bookingActive: true });
    expect(s.every((x) => x.done)).toBe(true);
  });
});
