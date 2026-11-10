import { BUSINESS_TZ, fromDateTimeLocal, zonedParts } from "@/lib/zaman";

/**
 * Online randevu için gün/saat yardımcıları. Her şey işletmenin saat
 * diliminde (İstanbul) hesaplanır: müşterinin tarayıcı saat dilimi ya da
 * sunucunun (UTC) saati sonucu değiştirmez.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function todayKey(): string {
  const p = zonedParts(Date.now());
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Şu an İstanbul saatiyle gün içindeki dakika (0–1439). */
export function nowMinutes(): number {
  const p = zonedParts(Date.now());
  return p.h * 60 + p.min;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 1 = Pazartesi … 7 = Pazar (takvim günü; saat diliminden bağımsız). */
export function isoWeekday(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const g = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return g === 0 ? 7 : g;
}

const WEEKDAY = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEEKDAY_LONG = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const MONTH = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export function dayParts(key: string) {
  const [, m, d] = key.split("-").map(Number);
  const wd = isoWeekday(key);
  return { day: d, month: MONTH[m - 1], weekday: WEEKDAY[wd], weekdayLong: WEEKDAY_LONG[wd] };
}

/** "Cuma, 6 Kas" */
export function dayLabel(key: string): string {
  const p = dayParts(key);
  return `${p.weekdayLong}, ${p.day} ${p.month}`;
}

/** "09:00:00" / "9:00" → dakika. */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Açılış–kapanış arasındaki randevu saatleri ("09:00", "09:30", …). */
export function slotTimes(start: string, end: string, slotMinutes: number): string[] {
  const out: string[] = [];
  const step = Math.max(slotMinutes, 5);
  for (let m = toMinutes(start); m + step <= toMinutes(end); m += step) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

export function timeToMinutes(t: string): number {
  return toMinutes(t);
}

/** Seçilen gün ve saat (İstanbul saati) → gerçek anı gösteren ISO (veritabanına bu gider). */
export function toStartsAt(dayKey: string, time: string): string | null {
  return fromDateTimeLocal(`${dayKey}T${time}`, BUSINESS_TZ);
}
