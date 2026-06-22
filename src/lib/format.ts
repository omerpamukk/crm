/** Ortak biçimlendirme yardımcıları (TR yerel ayarı). */

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR");
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

/** ISO timestamp → <input type="datetime-local"> değeri (YYYY-MM-DDTHH:mm). */
export function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}
