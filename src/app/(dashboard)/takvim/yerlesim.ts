/**
 * Takvim yerleşimi (saf): çakışan blokları yan yana dizme, saat aralığı ve
 * mesai dışı bölgeler. Dakikalar günün dakikasıdır (00:00 = 0).
 */

export type Span = { id: string; start: number; end: number };
export type Slot = { col: number; cols: number; span: number };

/** Çok kısa randevu da en az bu kadar yer kaplar (üst üste binmesin). */
const MIN_VISUAL = 15;

/**
 * Çakışan aralıkları sütunlara dağıtır (Google Takvim gibi):
 * - Birbirine zincirle bağlı çakışmalar bir küme olur; küme içindeki her
 *   blok aynı sütun sayısını paylaşır.
 * - Blok, sağındaki sütunlar o saatte boşsa onlara da yayılır (`span`).
 */
export function packOverlaps(items: readonly Span[]): Map<string, Slot> {
  const sorted = [...items]
    .map((s) => ({ ...s, end: Math.max(s.end, s.start + MIN_VISUAL) }))
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start) || a.id.localeCompare(b.id));

  const out = new Map<string, Slot>();
  let cluster: { item: Span; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const cols = colEnds.length;
    for (const { item, col } of cluster) {
      let span = 1;
      for (let k = col + 1; k < cols; k++) {
        const blocked = cluster.some(
          (o) => o.col === k && o.item.start < item.end && item.start < o.item.end
        );
        if (blocked) break;
        span++;
      }
      out.set(item.id, { col, cols, span });
    }
    cluster = [];
    colEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= clusterEnd && cluster.length) flush();
    let col = colEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else {
      colEnds[col] = item.end;
    }
    cluster.push({ item, col });
    clusterEnd = cluster.length === 1 ? item.end : Math.max(clusterEnd, item.end);
  }
  if (cluster.length) flush();
  return out;
}

/**
 * Izgaranın saat aralığı: mesai pencereleri ve randevular sığar; mesai
 * bilgisi yoksa 09:00–18:00 tabandır. Saat başına yuvarlanır, 0–24 içinde kalır.
 */
export function hourBounds(
  windows: readonly { start: number; end: number }[],
  spans: readonly { start: number; end: number }[],
  fallback: [number, number] = [9, 18]
): [number, number] {
  // Mesai bilgisi yoksa olağan gün (09–18) taban olur; randevular dışarı taşarsa genişler
  const base = windows.length ? windows : [{ start: fallback[0] * 60, end: fallback[1] * 60 }];
  const all = [...base, ...spans];
  const lo = Math.min(...all.map((w) => w.start));
  const hi = Math.max(...all.map((w) => w.end));
  let start = Math.max(0, Math.floor(lo / 60));
  let end = Math.min(24, Math.ceil(hi / 60));
  // En az 4 saatlik ızgara: tek kısa randevu ekranı garip daraltmasın
  if (end - start < 4) {
    end = Math.min(24, start + 4);
    start = Math.max(0, end - 4);
  }
  return [start, end];
}

/** Mesai penceresi: `null` = o gün kapalı, `undefined` = bilgi yok. */
export type WorkWindow = { start: number; end: number } | null | undefined;

/**
 * Izgara aralığında soluk gösterilecek bölgeler: mesai dışı + izinler.
 * Bilgi yoksa (undefined) yalnızca izinler döner.
 */
export function offIntervals(
  window: WorkWindow,
  from: number,
  to: number,
  extra: readonly [number, number][] = []
): [number, number][] {
  const out: [number, number][] = [];
  if (window === null) {
    out.push([from, to]);
  } else if (window) {
    if (window.start > from) out.push([from, Math.min(window.start, to)]);
    if (window.end < to) out.push([Math.max(window.end, from), to]);
  }
  for (const [s, e] of extra) {
    const a = Math.max(s, from);
    const b = Math.min(e, to);
    if (b > a) out.push([a, b]);
  }
  return out.filter(([a, b]) => b > a);
}
