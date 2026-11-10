import { describe, expect, it } from "vitest";

import { isDebtor, isOverdue, summarizeBalances } from "./balances";

describe("summarizeBalances", () => {
  it("boş listede sıfır döner", () => {
    expect(summarizeBalances([])).toEqual({ openDebt: 0, debtorCount: 0, overdueAmount: 0, overdueCount: 0 });
  });

  it("yalnızca borçluları sayar; fazla ödeme ve sıfır bakiye dışarıda", () => {
    const s = summarizeBalances([
      { balance: 1000, overdue_amount: 0 },
      { balance: 0, overdue_amount: 0 },
      { balance: -250, overdue_amount: 0 },
      { balance: 500.5, overdue_amount: 200 },
    ]);
    expect(s).toEqual({ openDebt: 1500.5, debtorCount: 2, overdueAmount: 200, overdueCount: 1 });
  });

  it("borcu olmayanın gecikmiş tutarı sayılmaz", () => {
    expect(isOverdue({ balance: 0, overdue_amount: 100 })).toBe(false);
    expect(isOverdue({ balance: 100, overdue_amount: 100 })).toBe(true);
    expect(isDebtor({ balance: 0.01 })).toBe(true);
  });

  it("kuruş toplamı yuvarlar", () => {
    const s = summarizeBalances([
      { balance: 0.1, overdue_amount: 0 },
      { balance: 0.2, overdue_amount: 0 },
    ]);
    expect(s.openDebt).toBe(0.3);
  });
});
