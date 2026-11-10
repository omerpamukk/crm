/**
 * Saat dilimi yardımcıları (saf fonksiyonlar, sunucu ve istemcide aynı sonuç).
 *
 * Kural: veritabanındaki her zaman damgası gerçek bir andır (UTC, ofsetli ISO).
 * Kullanıcıya her zaman işletmenin saat diliminde gösterilir, kullanıcıdan
 * gelen ofsetsiz "yerel" saat (datetime-local) işletmenin diliminde yorumlanıp
 * ofsetli ISO'ya çevrilir. Sunucunun (Vercel = UTC) ya da tarayıcının dilimine
 * asla bakılmaz.
 *
 * Türkiye 2016'dan beri sabit UTC+3'tür ama ofset sabit kodlanmaz; Intl'den
 * okunur. `businesses.timezone` (0007) sütunu var, ancak şimdilik tüm
 * işletmeler Türkiye'de olduğundan arayüz sabit BUSINESS_TZ'yi kullanır.
 */

export const BUSINESS_TZ = "Europe/Istanbul";

const cache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = cache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    cache.set(tz, f);
  }
  return f;
}

/** Geçersiz ya da boş dilim adı → varsayılan (Türkiye). */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return BUSINESS_TZ;
  try {
    partsFormatter(tz);
    return tz;
  } catch {
    return BUSINESS_TZ;
  }
}

export interface ZonedParts {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
  h: number;
  min: number;
  s: number;
}

/** Bir anın verilen dilimdeki takvim/saat parçaları. */
export function zonedParts(ms: number, tz: string = BUSINESS_TZ): ZonedParts {
  const out: ZonedParts = { y: 0, m: 0, d: 0, h: 0, min: 0, s: 0 };
  for (const p of partsFormatter(tz).formatToParts(new Date(ms))) {
    if (p.type === "year") out.y = Number(p.value);
    else if (p.type === "month") out.m = Number(p.value);
    else if (p.type === "day") out.d = Number(p.value);
    else if (p.type === "hour") out.h = Number(p.value) % 24;
    else if (p.type === "minute") out.min = Number(p.value);
    else if (p.type === "second") out.s = Number(p.value);
  }
  return out;
}

/** Dilimin o andaki UTC farkı (ms). */
function offsetMs(ms: number, tz: string): number {
  const p = zonedParts(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Dilimdeki duvar saati (ofsetsiz) → gerçek an (ms). */
export function zonedWallToUtcMs(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  tz: string = BUSINESS_TZ
): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off1 = offsetMs(guess, tz);
  const first = guess - off1;
  const off2 = offsetMs(first, tz);
  return off2 === off1 ? first : guess - off2;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const HAS_OFFSET = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;

/** "YYYY-MM-DD" biçiminde yalnızca tarih mi? (date sütunları) */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Saklanan ISO → <input type="datetime-local"> değeri ("YYYY-MM-DDTHH:mm"),
 * işletme diliminde. Yalnızca-tarih değeri (date sütunu) kaymaz: gece yarısı
 * olarak döner. Geçersiz/boş değerde "".
 */
export function toDateTimeLocal(value: string | null | undefined, tz: string = BUSINESS_TZ): string {
  if (!value) return "";
  if (isDateOnly(value)) return `${value}T00:00`;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return "";
  const p = zonedParts(ms, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/**
 * datetime-local değeri ("YYYY-MM-DDTHH:mm", ofsetsiz) → ofsetli ISO (UTC).
 * Ofsetsiz değer işletme diliminde yorumlanır. Zaten ofsetli/Z'li ISO verilirse
 * olduğu gibi (an olarak) çevrilir. Geçersiz değer ya da o dilimde var olmayan
 * saat (ör. yaz saati geçişi boşluğu) için null.
 */
export function fromDateTimeLocal(value: string | null | undefined, tz: string = BUSINESS_TZ): string | null {
  if (!value) return null;
  const v = value.trim();

  const timePart = v.split("T")[1] ?? v.split(" ")[1];
  if (timePart && HAS_OFFSET.test(timePart)) {
    const ms = new Date(v).getTime();
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }

  const m = LOCAL.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1, 6).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;

  const ms = zonedWallToUtcMs(y, mo, d, h, mi, tz);
  // Gidiş-dönüş: 31 Şubat ya da yaz saati boşluğu gibi var olmayan zamanı ele.
  const back = zonedParts(ms, tz);
  if (back.y !== y || back.m !== mo || back.d !== d || back.h !== h || back.min !== mi) return null;
  return new Date(ms).toISOString();
}
