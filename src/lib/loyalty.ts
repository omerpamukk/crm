import { BUSINESS_TZ, zonedParts } from "@/lib/zaman";

/**
 * Sadakat kartı (0040): "N. ziyarette hediye".
 *
 * Ziyaret = geçmiş tarihli, iptal edilmemiş ve "gelmedi" olmayan randevu;
 * aynı gündeki birden çok randevu tek ziyaret sayılır (müşteri ritmiyle
 * aynı kural). Sayaç son hediyeden sonra başlar.
 */

export type LoyaltySettings = { target: number; reward: string | null; notifyBefore: number | null };

export type LoyaltyVisit = { starts_at: string; status: string | null };

export type LoyaltyProgress = {
  /** Son hediyeden bu yana ziyaret (en fazla hedef kadar gösterilir). */
  count: number;
  target: number;
  /** Hediyeye kalan ziyaret (0 = hediye hakkı var). */
  remaining: number;
  eligible: boolean;
};

export function dayKey(iso: string, tz: string = BUSINESS_TZ): string {
  const p = zonedParts(new Date(iso).getTime(), tz);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Son hediyeden sonraki ziyaret günü sayısı. */
export function countVisits(visits: LoyaltyVisit[], since: string | null, now = new Date(), tz: string = BUSINESS_TZ): number {
  const sinceMs = since ? new Date(since).getTime() : -Infinity;
  const days = new Set<string>();
  for (const v of visits) {
    if (v.status === "cancelled" || v.status === "no_show") continue;
    const t = new Date(v.starts_at).getTime();
    if (t > now.getTime() || t <= sinceMs) continue;
    days.add(dayKey(v.starts_at, tz));
  }
  return days.size;
}

export function loyaltyProgress(visitCount: number, target: number): LoyaltyProgress {
  const count = Math.min(visitCount, target);
  const remaining = Math.max(0, target - visitCount);
  return { count, target, remaining, eligible: remaining === 0 };
}

/** Kartı okunur kılar: "7/10 · 3 ziyaret sonra hediye". */
export function loyaltySentence(p: LoyaltyProgress, reward: string | null): string {
  const gift = reward?.trim() || "hediye";
  if (p.eligible) return `Hediye hakkı var: ${gift}`;
  return `${p.remaining} ziyaret sonra ${gift}`;
}

/** Ayarlardan gelen değerler geçerli mi (kapalıysa null). */
export function readLoyalty(row: {
  loyalty_target?: number | null;
  loyalty_reward?: string | null;
  loyalty_notify_before?: number | null;
} | null): LoyaltySettings | null {
  const target = row?.loyalty_target ?? null;
  if (!target || target < 2) return null;
  return { target, reward: row?.loyalty_reward ?? null, notifyBefore: row?.loyalty_notify_before ?? null };
}
