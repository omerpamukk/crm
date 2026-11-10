/**
 * Panel tarih yardımcıları — işletme saati Türkiye saati (UTC+3, yaz saati yok).
 * Sunucu hangi saat diliminde çalışırsa çalışsın "bugün", "bu hafta" ve saat
 * metinleri aynı kalır; istemci ile sunucu çıktısı da eşleşir.
 */
export const TZ = "Europe/Istanbul";
const TZ_MS = 3 * 3_600_000;
export const DAY = 86_400_000;

/** Türkiye saatiyle yıl/ay/gün/haftanın günü (0 = Pazar). */
export function trParts(d: Date) {
  const t = new Date(d.getTime() + TZ_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() };
}

/** Türkiye saatiyle gün başlangıcı (taşan gün/ay değerleri doğru toplanır). */
export function trMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - TZ_MS);
}

/** Günün dakikası (00:00 = 0), Türkiye saatiyle. */
export function trMinutes(ms: number): number {
  const t = new Date(ms + TZ_MS);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ });
export const fmtTime = (iso: string | number): string => TIME.format(new Date(iso));

const SHORT_DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: TZ });
export const fmtShortDate = (iso: string): string => SHORT_DATE.format(new Date(iso));

export const PERIODS = [
  { key: "bugun", label: "Bugün", comp: "dünle aynı saate göre" },
  { key: "hafta", label: "Bu Hafta", comp: "geçen haftaya göre" },
  { key: "ay", label: "Bu Ay", comp: "geçen ay aynı döneme göre" },
  { key: "yil", label: "Bu Yıl", comp: "geçen yıl aynı döneme göre" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

/**
 * Dönem sınırları. Karşılaştırma dönemi, şu ana kadar geçen süreyle aynı
 * uzunluktadır ("geçen ay aynı döneme göre"); ayın ortasında yarım ayı tam
 * ayla kıyaslayıp yanlış düşüş göstermez.
 */
export function resolvePeriod(key: PeriodKey, now: Date) {
  const { y, m, d, dow } = trParts(now);
  const off = (dow + 6) % 7; // Pazartesi = 0
  let start: Date, end: Date, prevStart: Date;
  if (key === "bugun") {
    start = trMidnight(y, m, d);
    end = trMidnight(y, m, d + 1);
    prevStart = trMidnight(y, m, d - 1);
  } else if (key === "hafta") {
    start = trMidnight(y, m, d - off);
    end = trMidnight(y, m, d - off + 7);
    prevStart = trMidnight(y, m, d - off - 7);
  } else if (key === "yil") {
    start = trMidnight(y, 0, 1);
    end = trMidnight(y + 1, 0, 1);
    prevStart = trMidnight(y - 1, 0, 1);
  } else {
    start = trMidnight(y, m, 1);
    end = trMidnight(y, m + 1, 1);
    prevStart = trMidnight(y, m - 1, 1);
  }
  const elapsed = Math.max(0, Math.min(now.getTime(), end.getTime()) - start.getTime());
  const upToNow = new Date(Math.min(now.getTime(), end.getTime()));
  const prevEnd = new Date(Math.min(prevStart.getTime() + elapsed, start.getTime()));
  return { start, end, upToNow, prevStart, prevEnd };
}

/** Doğum gününe kalan gün (bugün = 0). */
export function daysUntilBirthday(birthday: string, now: Date): number | null {
  const [, bm, bd] = birthday.split("-").map(Number);
  if (!bm || !bd) return null;
  const { y, m, d } = trParts(now);
  const today = Date.UTC(y, m, d);
  let next = Date.UTC(y, bm - 1, bd);
  if (next < today) next = Date.UTC(y + 1, bm - 1, bd);
  return Math.round((next - today) / DAY);
}

export const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
