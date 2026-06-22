/** Ortak biçimlendirme yardımcıları (TR yerel ayarı). */

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR");
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
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
