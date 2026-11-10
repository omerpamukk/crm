/**
 * Randevular ve Satışlar sayfalarının tarih aralığı mantığı (saf fonksiyonlar).
 * URL'de: aralik=gun|hafta|ay|ozel · tarih=YYYY-MM-DD (gezinme günü) ·
 * bas / bit (özel aralık).
 *
 * Tüm gün sınırları işletmenin saat diliminde (İstanbul) hesaplanır; tarayıcının
 * ya da sunucunun dilimine bakılmaz. Date değerleri gerçek anlardır:
 * start/end "İstanbul gece yarısı" anıdır.
 */

import { BUSINESS_TZ } from "@/lib/zaman";

import { addDays, addMonths, dayKeyOf, isDayKey, startOfWeek, zonedToUtc } from "../takvim/zaman";

export type RangeKind = "gun" | "hafta" | "ay" | "ozel";

export const RANGE_KINDS: readonly RangeKind[] = ["gun", "hafta", "ay", "ozel"];

export function isRangeKind(v: string | null | undefined): v is RangeKind {
  return !!v && (RANGE_KINDS as readonly string[]).includes(v);
}

const TZ = BUSINESS_TZ;

/** Bir anın İstanbul'daki gün anahtarı (YYYY-MM-DD). */
export function toDateKey(d: Date): string {
  return dayKeyOf(d.getTime(), TZ);
}

/** YYYY-MM-DD → o günün İstanbul gece yarısı; geçersizse null. */
export function parseDateKey(key: string | null | undefined): Date | null {
  if (!isDayKey(key)) return null;
  return new Date(zonedToUtc(key, 0, TZ));
}

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("tr-TR", { ...o, timeZone: TZ });

export type ResolvedRange = {
  /** Aralığın ilk anı (dahil). */
  start: Date;
  /** Aralığın bitişi (hariç). */
  end: Date;
  /** Gezinme çubuğundaki metin. */
  label: string;
  /** Tüm aralık bugünü kapsıyor mu? */
  includesToday: boolean;
};

export function resolveRange(
  kind: RangeKind,
  anchorKey: string | null,
  basKey: string | null,
  bitKey: string | null,
  today: Date
): ResolvedRange {
  const todayKey = toDateKey(today);
  const at = (key: string) => new Date(zonedToUtc(key, 0, TZ));
  const anchorK = isDayKey(anchorKey) ? anchorKey : todayKey;
  let startK: string;
  let endK: string; // hariç
  let label: string;

  if (kind === "gun") {
    startK = anchorK;
    endK = addDays(anchorK, 1);
    label = fmt(at(anchorK), { weekday: "long", day: "numeric", month: "long" });
  } else if (kind === "hafta") {
    startK = startOfWeek(anchorK);
    endK = addDays(startK, 7);
    const lastK = addDays(endK, -1);
    label =
      startK.slice(5, 7) === lastK.slice(5, 7)
        ? `${Number(startK.slice(8, 10))} – ${fmt(at(lastK), { day: "numeric", month: "long" })}`
        : `${fmt(at(startK), { day: "numeric", month: "short" })} – ${fmt(at(lastK), { day: "numeric", month: "short" })}`;
  } else if (kind === "ay") {
    startK = `${anchorK.slice(0, 7)}-01`;
    endK = addMonths(startK, 1);
    label = fmt(at(startK), { month: "long", year: "numeric" });
  } else {
    const a = isDayKey(basKey) ? basKey : todayKey;
    const b = isDayKey(bitKey) ? bitKey : a;
    startK = a <= b ? a : b;
    const lastK = a <= b ? b : a;
    endK = addDays(lastK, 1);
    label = `${fmt(at(startK), { day: "numeric", month: "short" })} – ${fmt(at(lastK), { day: "numeric", month: "short" })}`;
  }

  return { start: at(startK), end: at(endK), label, includesToday: todayKey >= startK && todayKey < endK };
}

/** ‹ › gezinmesi: yeni gezinme günü (YYYY-MM-DD). */
export function shiftAnchor(kind: RangeKind, anchorKey: string | null, dir: -1 | 1, today: Date): string {
  const anchor = isDayKey(anchorKey) ? anchorKey : toDateKey(today);
  if (kind === "hafta") return addDays(anchor, 7 * dir);
  if (kind === "ay") return addMonths(`${anchor.slice(0, 7)}-01`, dir);
  return addDays(anchor, dir);
}
