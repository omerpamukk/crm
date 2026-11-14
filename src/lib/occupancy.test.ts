import { describe, expect, it } from "vitest";

import { computeOccupancy, type WorkingDay } from "./occupancy";

const week = (open: number[], start = "09:00", end = "18:00"): WorkingDay[] =>
  [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, open: open.includes(day), start, end }));

// 2026-11-16 Pazartesi. İstanbul UTC+3: 10:00 yerel = 07:00Z.
describe("doluluk", () => {
  it("kapasite çalışma saati × personel, dolu randevu süresi", () => {
    const o = computeOccupancy({
      workingDays: week([1]),
      staffCount: 2,
      appointments: [
        { starts_at: "2026-11-16T07:00:00Z", status: "completed", duration_min: 60 },
        { starts_at: "2026-11-16T07:00:00Z", status: "planned", duration_min: 60 },
        { starts_at: "2026-11-16T08:00:00Z", status: "cancelled", duration_min: 60 },
      ],
      startKey: "2026-11-16",
      endKey: "2026-11-17",
    });
    expect(o.capacityMin).toBe(9 * 60 * 2);
    expect(o.bookedMin).toBe(120);
    expect(o.pct).toBe(Math.round((120 / 1080) * 100));
    const ten = o.cells.find((c) => c.day === 1 && c.hour === 10);
    expect(ten?.pct).toBe(100);
    expect(o.cells.find((c) => c.day === 1 && c.hour === 11)?.pct).toBe(0);
  });

  it("süre yoksa 30 dk; saat dilimlerine bölünür", () => {
    const o = computeOccupancy({
      workingDays: week([1]),
      staffCount: 1,
      appointments: [
        { starts_at: "2026-11-16T07:30:00Z", status: null, duration_min: null },
        { starts_at: "2026-11-16T08:30:00Z", status: "planned", duration_min: 60 },
      ],
      startKey: "2026-11-16",
      endKey: "2026-11-17",
    });
    expect(o.bookedMin).toBe(90);
    expect(o.cells.find((c) => c.day === 1 && c.hour === 10)?.pct).toBe(50);
    expect(o.cells.find((c) => c.day === 1 && c.hour === 11)?.pct).toBe(50);
    expect(o.cells.find((c) => c.day === 1 && c.hour === 12)?.pct).toBe(50);
  });

  it("kapalı gün kapasite saymaz; en boş dilimler açık günlerden", () => {
    const o = computeOccupancy({
      workingDays: week([1, 2]),
      staffCount: 1,
      appointments: [],
      startKey: "2026-11-16",
      endKey: "2026-11-23",
    });
    expect(o.capacityMin).toBe(2 * 9 * 60);
    expect(o.cells.find((c) => c.day === 7 && c.hour === 10)?.pct).toBeNull();
    expect(o.quietest.every((c) => c.day === 1 || c.day === 2)).toBe(true);
    expect(o.hours[0]).toBe(9);
    expect(o.hours.at(-1)).toBe(17);
  });

  it("çalışma saati yoksa yüzde yok", () => {
    const o = computeOccupancy({ workingDays: week([]), staffCount: 3, appointments: [], startKey: "2026-11-16", endKey: "2026-11-17" });
    expect(o.pct).toBeNull();
  });
});
