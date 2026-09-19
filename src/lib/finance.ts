/**
 * Para ve seans hesapları.
 *
 * Bu hesaplar birden fazla sayfada tekrarlanıyordu (panel, cari, müşteriler,
 * raporlar). Tek yerde toplanıp test edilebilir hale getirildi.
 */

const DAY_MS = 86_400_000;

/** Paketin ödenmemiş kalan tutarı (negatif olmaz). */
export function packageDebt(pkg: {
  price: number | null;
  paid_amount: number | null;
}): number {
  return Math.max((pkg.price ?? 0) - (pkg.paid_amount ?? 0), 0);
}

/** Borç, satın alma tarihinden bu yana verilen günü geçmiş mi? */
export function isOverdue(
  pkg: { price: number | null; paid_amount: number | null; purchased_at: string | null },
  graceDays = 30,
  now: number = Date.now()
): boolean {
  if (packageDebt(pkg) <= 0) return false;
  if (!pkg.purchased_at) return false;
  return now - new Date(pkg.purchased_at).getTime() > graceDays * DAY_MS;
}

/** Personel hakedişi: ciro × komisyon oranı (%). */
export function commissionOf(revenue: number, ratePercent: number | null): number {
  if (!ratePercent || ratePercent <= 0) return 0;
  return (revenue * ratePercent) / 100;
}

/** Net kâr = gelir − gider. */
export function netProfit(income: number, expense: number): number {
  return income - expense;
}

/**
 * Doğum gününe kalan gün (bugün ise 0).
 * `birthday` "YYYY-MM-DD" biçiminde; yıl yok sayılır.
 */
export function daysUntilBirthday(birthday: string, today: Date = new Date()): number | null {
  const parts = birthday.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [, month, day] = parts;
  if (!month || !day) return null;

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < base) next = new Date(today.getFullYear() + 1, month - 1, day);

  return Math.round((next.getTime() - base.getTime()) / DAY_MS);
}

/** Paketin tamamlanma yüzdesi (0–100). */
export function packageProgress(pkg: {
  total_sessions: number | null;
  remaining_sessions: number | null;
}): number {
  const total = pkg.total_sessions ?? 0;
  if (total <= 0) return 0;
  const used = total - (pkg.remaining_sessions ?? 0);
  return Math.min(Math.max(Math.round((used / total) * 100), 0), 100);
}
