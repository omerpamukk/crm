import { describe, it, expect } from "vitest";

import {
  packageDebt,
  isOverdue,
  commissionOf,
  netProfit,
  daysUntilBirthday,
  packageProgress,
} from "./finance";

describe("paket borcu", () => {
  it("ödenmemiş kalanı hesaplar", () => {
    expect(packageDebt({ price: 10000, paid_amount: 3000 })).toBe(7000);
    expect(packageDebt({ price: 10000, paid_amount: 10000 })).toBe(0);
  });

  it("fazla ödemede negatif dönmez", () => {
    expect(packageDebt({ price: 1000, paid_amount: 1500 })).toBe(0);
  });

  it("eksik alanları 0 sayar", () => {
    expect(packageDebt({ price: null, paid_amount: null })).toBe(0);
    expect(packageDebt({ price: 5000, paid_amount: null })).toBe(5000);
  });
});

describe("gecikmiş borç", () => {
  const now = new Date("2026-09-19T12:00:00Z").getTime();

  it("30 günü geçen borcu gecikmiş sayar", () => {
    expect(
      isOverdue({ price: 5000, paid_amount: 0, purchased_at: "2026-08-01" }, 30, now)
    ).toBe(true);
  });

  it("yeni borcu gecikmiş saymaz", () => {
    expect(
      isOverdue({ price: 5000, paid_amount: 0, purchased_at: "2026-09-15" }, 30, now)
    ).toBe(false);
  });

  it("ödenmiş paketi gecikmiş saymaz", () => {
    expect(
      isOverdue({ price: 5000, paid_amount: 5000, purchased_at: "2026-01-01" }, 30, now)
    ).toBe(false);
  });

  it("tarih yoksa gecikmiş saymaz", () => {
    expect(isOverdue({ price: 5000, paid_amount: 0, purchased_at: null }, 30, now)).toBe(false);
  });
});

describe("komisyon", () => {
  it("ciro üzerinden yüzde hesaplar", () => {
    expect(commissionOf(10000, 15)).toBe(1500);
    expect(commissionOf(3333, 10)).toBeCloseTo(333.3, 1);
  });

  it("oran yoksa veya sıfırsa 0 döner", () => {
    expect(commissionOf(10000, null)).toBe(0);
    expect(commissionOf(10000, 0)).toBe(0);
    expect(commissionOf(10000, -5)).toBe(0);
  });
});

describe("net kâr", () => {
  it("gelir eksi gider", () => {
    expect(netProfit(50000, 20000)).toBe(30000);
  });

  it("zararda negatif döner", () => {
    expect(netProfit(10000, 25000)).toBe(-15000);
  });
});

describe("doğum günü", () => {
  const today = new Date(2026, 8, 19); // 19 Eylül 2026

  it("bugün ise 0 döner", () => {
    expect(daysUntilBirthday("1990-09-19", today)).toBe(0);
  });

  it("bu yıl içindeki günü sayar", () => {
    expect(daysUntilBirthday("1990-09-25", today)).toBe(6);
  });

  it("geçmiş tarihi gelecek yıla taşır", () => {
    const result = daysUntilBirthday("1990-09-15", today);
    expect(result).toBeGreaterThan(300);
  });

  it("geçersiz girdiye null döner", () => {
    expect(daysUntilBirthday("", today)).toBeNull();
    expect(daysUntilBirthday("bozuk", today)).toBeNull();
  });
});

describe("paket ilerlemesi", () => {
  it("kullanılan seans yüzdesini verir", () => {
    expect(packageProgress({ total_sessions: 10, remaining_sessions: 4 })).toBe(60);
    expect(packageProgress({ total_sessions: 10, remaining_sessions: 10 })).toBe(0);
    expect(packageProgress({ total_sessions: 10, remaining_sessions: 0 })).toBe(100);
  });

  it("toplam yoksa 0 döner", () => {
    expect(packageProgress({ total_sessions: null, remaining_sessions: 5 })).toBe(0);
    expect(packageProgress({ total_sessions: 0, remaining_sessions: 0 })).toBe(0);
  });

  it("0–100 aralığını aşmaz", () => {
    expect(packageProgress({ total_sessions: 5, remaining_sessions: 99 })).toBe(0);
  });
});
