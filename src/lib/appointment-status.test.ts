import { describe, it, expect } from "vitest";

import {
  canMarkArrived,
  canUndoArrived,
  canChangeArrival,
  isRemindable,
  REMINDABLE_STATUSES,
} from "./appointment-status";
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "./constants";

describe("Geldi geçişi", () => {
  it("yalnızca Planlandı'dan Geldi'ye geçilir", () => {
    expect(canMarkArrived("planned")).toBe(true);
    expect(canMarkArrived(null)).toBe(true); // varsayılan durum planned
    for (const s of ["arrived", "completed", "cancelled", "no_show"]) {
      expect(canMarkArrived(s), s).toBe(false);
    }
  });

  it("geri alma yalnızca Geldi durumunda çalışır", () => {
    expect(canUndoArrived("arrived")).toBe(true);
    for (const s of ["planned", "completed", "cancelled", "no_show", null]) {
      expect(canUndoArrived(s), String(s)).toBe(false);
    }
  });
});

describe("Geldi etiketi ve rengi", () => {
  it("etiket Geldi, durum listesinde Planlandı ile Tamamlandı arasında", () => {
    expect(appointmentStatusLabel("arrived")).toBe("Geldi");
    const values = APPOINTMENT_STATUSES.map((s) => s.value);
    expect(values.indexOf("arrived")).toBe(values.indexOf("planned") + 1);
    expect(values.indexOf("arrived")).toBeLessThan(values.indexOf("completed"));
  });

  it("varyant tanımlı ve Planlandı/Gelmedi'den ayrı", () => {
    expect(appointmentStatusVariant("arrived")).toBe("positive");
    expect(appointmentStatusVariant("arrived")).not.toBe(appointmentStatusVariant("planned"));
    expect(appointmentStatusVariant("arrived")).not.toBe(appointmentStatusVariant("no_show"));
  });
});

describe("hatırlatma", () => {
  it("gelmiş müşteriye 'randevunuzu unutmayın' gitmez", () => {
    expect(isRemindable("arrived")).toBe(false);
    expect(REMINDABLE_STATUSES).not.toContain("arrived");
  });

  it("yalnızca planlı randevuya gider", () => {
    expect(isRemindable("planned")).toBe(true);
    for (const s of ["completed", "cancelled", "no_show"]) {
      expect(isRemindable(s), s).toBe(false);
    }
  });
});

describe("kim işaretleyebilir", () => {
  it("yönetici ve resepsiyon her randevuyu işaretler", () => {
    expect(canChangeArrival("owner", null, "s1")).toBe(true);
    expect(canChangeArrival("reception", null, null)).toBe(true);
  });

  it("uzman yalnızca kendi randevusunu işaretler", () => {
    expect(canChangeArrival("specialist", "s1", "s1")).toBe(true);
    expect(canChangeArrival("specialist", "s1", "s2")).toBe(false);
    expect(canChangeArrival("specialist", null, null)).toBe(false);
  });

  it("rolü olmayan işaretleyemez", () => {
    expect(canChangeArrival(null, "s1", "s1")).toBe(false);
  });
});
