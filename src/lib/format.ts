/**
 * Ortak biçimlendirme yardımcıları (TR yerel ayarı).
 *
 * Zaman damgaları HER ZAMAN işletme saat diliminde (BUSINESS_TZ) gösterilir;
 * sunucu (UTC) ve tarayıcı aynı metni üretir. Yalnızca-tarih (`date`)
 * değerleri ("2026-11-05") gün olarak kalır, saat dilimiyle kaymaz.
 */
import { BUSINESS_TZ, isDateOnly } from "./zaman";

export { BUSINESS_TZ, toDateTimeLocal, fromDateTimeLocal } from "./zaman";

function parse(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | null): string {
  const d = parse(value);
  if (!d) return "\u2014";
  // date sütunu: UTC gece yarısı olarak okunur, UTC'de yazılırsa gün değişmez.
  const timeZone = isDateOnly(value as string) ? "UTC" : BUSINESS_TZ;
  return d.toLocaleDateString("tr-TR", { timeZone });
}

export function formatDateTime(value: string | null): string {
  const d = parse(value);
  if (!d) return "\u2014";
  return d.toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BUSINESS_TZ,
  });
}

export function formatTime(value: string | null): string {
  const d = parse(value);
  if (!d) return "\u2014";
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: BUSINESS_TZ,
  });
}

/** ₺ biçimi; küsurat yoksa kuruş gösterilmez (₺1.200), `Money` ile aynı. */
export function formatPrice(value: number | null): string {
  if (value == null) return "—";
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
