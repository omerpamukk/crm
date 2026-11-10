/**
 * Raporlar ve Giderler için dönem çözümü (sunucuda, adres parametrelerinden).
 * Gün sınırları İstanbul saatindedir; önceki dönem aynı uzunlukta hesaplanır.
 */
import { addDays, addMonths, diffDays } from "../takvim/zaman";
import {
  isRangeKind,
  resolveRange,
  toDateKey,
  type RangeKind,
  type ResolvedRange,
} from "../randevular/date-range";

export type Period = {
  kind: RangeKind;
  range: ResolvedRange;
  /** İlk gün (dahil), YYYY-MM-DD. */
  startKey: string;
  /** Son gün (dahil), YYYY-MM-DD. */
  lastKey: string;
  /** Bitiş anı (hariç). */
  endKey: string;
  /** Önceki dönem: [prevStartKey, prevEndKey) aynı süre (devam eden dönemde aynı gün sayısı). */
  prevStartKey: string;
  prevEndKey: string;
  /** Karşılaştırma devam eden bir dönemle mi yapılıyor ("aynı döneme göre")? */
  partial: boolean;
};

type Params = { aralik?: string; tarih?: string; bas?: string; bit?: string };

export function resolvePeriod(sp: Params, defaultKind: RangeKind, kinds: readonly RangeKind[], now = new Date()): Period {
  const kind: RangeKind = isRangeKind(sp.aralik) && kinds.includes(sp.aralik) ? sp.aralik : defaultKind;
  const range = resolveRange(kind, sp.tarih ?? null, sp.bas ?? null, sp.bit ?? null, now);
  const startKey = toDateKey(range.start);
  const endKey = toDateKey(range.end);
  const lastKey = addDays(endKey, -1);
  const todayKey = toDateKey(now);

  // Devam eden dönemde yalnızca geçen günler karşılaştırılır (yarım ay, geçen ayın tamamıyla kıyaslanmaz).
  const elapsedEnd = range.includesToday ? addDays(todayKey, 1) : endKey;
  const elapsed = Math.max(diffDays(startKey, elapsedEnd), 1);

  let prevStartKey: string;
  let prevEndKey: string;
  if (kind === "ay") {
    prevStartKey = addMonths(startKey, -1);
    prevEndKey = addDays(prevStartKey, elapsed);
    if (prevEndKey > startKey) prevEndKey = startKey;
  } else {
    const span = diffDays(startKey, endKey);
    prevStartKey = addDays(startKey, -span);
    prevEndKey = addDays(prevStartKey, elapsed);
  }
  return { kind, range, startKey, lastKey, endKey, prevStartKey, prevEndKey, partial: range.includesToday };
}

export const pct = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
