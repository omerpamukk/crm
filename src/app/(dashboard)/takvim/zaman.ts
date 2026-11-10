/**
 * Takvimin tarih ve saat yardımcıları (saf; sunucu ve istemci ortak).
 *
 * Neden işletmenin saat dilimi: takvim, salonun duvar saatini gösterir.
 * Sunucu (Vercel: UTC) ile tarayıcı aynı dilimde olmasa da "bugün", blok
 * konumu ve saat metinleri aynı çıkar; hydration uyuşmazlığı olmaz.
 *
 * Gün anahtarı ("YYYY-MM-DD") takvim günüdür; gün aritmetiği UTC üzerinde
 * yapılır (yaz saati geçişlerinden etkilenmez).
 */

import { zonedParts, zonedWallToUtcMs } from "@/lib/zaman";

export type Gorunum = "gun" | "hafta" | "ay";
export const GORUNUMLER: readonly Gorunum[] = ["gun", "hafta", "ay"];

export function isGorunum(v: string | null | undefined): v is Gorunum {
  return !!v && (GORUNUMLER as readonly string[]).includes(v);
}

/** 1 = Pazartesi … 7 = Pazar (işletme ayarlarıyla aynı). */
export const GUN_KISA = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
export const GUN_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;
export const AY_UZUN = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;
export const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"] as const;

const DAY_MS = 86_400_000;

/* ---------------- Saat dilimi (çekirdek: src/lib/zaman.ts) ---------------- */

/** İşletme saatindeki gün + dakika → gerçek an (ms). */
export function zonedToUtc(dayKey: string, minutes: number, tz: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return zonedWallToUtcMs(y, m, d, 0, minutes, tz);
}

/** Anın işletme saatindeki gün anahtarı. */
export function dayKeyOf(value: number | string, tz: string): string {
  const ms = typeof value === "number" ? value : new Date(value).getTime();
  const p = zonedParts(ms, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** İşletme saatine göre bugünün anahtarı. */
export function todayKeyIn(tz: string): string {
  return dayKeyOf(Date.now(), tz);
}

/** Anın işletme saatinde günün kaçıncı dakikası olduğu (00:00 = 0). */
export function minuteOfDay(value: number | string, tz: string): number {
  const ms = typeof value === "number" ? value : new Date(value).getTime();
  const p = zonedParts(ms, tz);
  return p.h * 60 + p.min;
}

/* ---------------- Gün anahtarı aritmetiği ---------------- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** "YYYY-MM-DD" ve gerçek bir tarih mi? */
export function isDayKey(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  if (y < 2000 || y > 2100) return false;
  return utcToKey(Date.UTC(y, m - 1, d)) === v;
}

export function addDays(key: string, n: number): string {
  return utcToKey(keyToUtc(key) + n * DAY_MS);
}

/** İki gün arasındaki fark (b − a, gün). */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY_MS);
}

/** 1 = Pazartesi … 7 = Pazar. */
export function weekdayOf(key: string): number {
  const dow = new Date(keyToUtc(key)).getUTCDay(); // 0 = Pazar
  return dow === 0 ? 7 : dow;
}

export function startOfWeek(key: string): string {
  return addDays(key, 1 - weekdayOf(key));
}

/** Ay ekler; gün ayın son gününe sığdırılır (31 Ocak + 1 ay = 28/29 Şubat). */
export function addMonths(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return utcToKey(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last)));
}

export function monthOf(key: string): { y: number; m: number } {
  const [y, m] = key.split("-").map(Number);
  return { y, m };
}

/** Başlangıç ve bitiş dahil günler. */
export function daysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

/** "09:00" → 540; geçersizse null. */
export function parseHHMM(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** 540 → "09:00". */
export function hhmm(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/* ---------------- Görünüm aralığı ve gezinme ---------------- */

export type DayRange = { start: string; end: string };

/** Görünümün gösterdiği günler (dahil). Ay: Pazartesi'den başlayan tam haftalar. */
export function visibleRange(view: Gorunum, key: string): DayRange {
  if (view === "gun") return { start: key, end: key };
  if (view === "hafta") {
    const start = startOfWeek(key);
    return { start, end: addDays(start, 6) };
  }
  const { y, m } = monthOf(key);
  const first = `${y}-${pad(m)}-01`;
  const last = utcToKey(Date.UTC(y, m, 0));
  return { start: startOfWeek(first), end: addDays(startOfWeek(last), 6) };
}

/** Bir adım ileri/geri: gün, hafta ya da ay. */
export function stepDate(view: Gorunum, key: string, dir: number): string {
  if (view === "gun") return addDays(key, dir);
  if (view === "hafta") return addDays(key, dir * 7);
  return addMonths(key, dir);
}

export function rangeIncludes(r: DayRange, key: string): boolean {
  return key >= r.start && key <= r.end;
}

/** Ay görünümünün haftaları (her biri 7 gün). */
export function monthWeeks(key: string): string[][] {
  const { start, end } = visibleRange("ay", key);
  const days = daysInRange(start, end);
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/* ---------------- Metinler ---------------- */

function dayNum(key: string): number {
  return Number(key.slice(8, 10));
}

/** "5 Kasım Perşembe" (yıl bugünkünden farklıysa "5 Kasım 2025 Çarşamba"). */
export function dayTitle(key: string, todayKey: string, short = false): string {
  const { y, m } = monthOf(key);
  const year = y !== monthOf(todayKey).y ? ` ${y}` : "";
  const wd = weekdayOf(key) - 1;
  if (short) return `${dayNum(key)} ${AY_KISA[m - 1]}${year} ${GUN_KISA[wd]}`;
  return `${dayNum(key)} ${AY_UZUN[m - 1]}${year} ${GUN_UZUN[wd]}`;
}

/** Gezinme başlığı: gün, hafta aralığı ya da ay. */
export function rangeTitle(view: Gorunum, key: string, todayKey: string, short = false): string {
  const months = short ? AY_KISA : AY_UZUN;
  if (view === "gun") return dayTitle(key, todayKey, short);
  if (view === "ay") {
    const { y, m } = monthOf(key);
    return `${AY_UZUN[m - 1]} ${y}`;
  }
  const { start, end } = visibleRange("hafta", key);
  const a = monthOf(start);
  const b = monthOf(end);
  const yearB = short && b.y === monthOf(todayKey).y ? "" : ` ${b.y}`;
  if (a.y !== b.y) {
    return short
      ? `${dayNum(start)} ${months[a.m - 1]} – ${dayNum(end)} ${months[b.m - 1]}`
      : `${dayNum(start)} ${months[a.m - 1]} ${a.y} – ${dayNum(end)} ${months[b.m - 1]} ${b.y}`;
  }
  if (a.m !== b.m) return `${dayNum(start)} ${months[a.m - 1]} – ${dayNum(end)} ${months[b.m - 1]}${yearB}`;
  return `${dayNum(start)}–${dayNum(end)} ${months[b.m - 1]}${yearB}`;
}
