/** İşletme onboarding sırasında seçilebilecek sektörler. */
export const SECTORS = [
  { value: "guzellik_salonu", label: "Güzellik Salonu" },
  { value: "klinik", label: "Klinik" },
  { value: "spor_salonu", label: "Spor Salonu" },
  { value: "masaj_salonu", label: "Masaj Salonu" },
  { value: "restoran_kafe", label: "Restoran / Kafe" },
  { value: "arac_kiralama", label: "Araç Kiralama" },
  { value: "teknik_servis", label: "Teknik Servis" },
  { value: "diger", label: "Diğer" },
] as const;

/** Müşteri durumları. */
export const CUSTOMER_STATUSES = [
  { value: "new", label: "Yeni" },
  { value: "active", label: "Aktif" },
  { value: "passive", label: "Pasif" },
  { value: "lead", label: "Potansiyel" },
] as const;

export function customerStatusLabel(status: string | null): string {
  return CUSTOMER_STATUSES.find((s) => s.value === status)?.label ?? "—";
}

/** Durum badge renk varyantı (badge.tsx variant'larıyla eşleşir). */
export type StatusVariant =
  | "positive"
  | "warning"
  | "danger"
  | "info"
  | "secondary";

export function customerStatusVariant(status: string | null): StatusVariant {
  switch (status) {
    case "active":
      return "positive";
    case "new":
      return "info";
    case "lead":
      return "warning";
    case "passive":
      return "secondary";
    default:
      return "secondary";
  }
}

/** Randevu durumları. */
export const APPOINTMENT_STATUSES = [
  { value: "planned", label: "Planlandı" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal edildi" },
  { value: "no_show", label: "Gelmedi" },
] as const;

export function appointmentStatusLabel(status: string | null): string {
  return APPOINTMENT_STATUSES.find((s) => s.value === status)?.label ?? "—";
}

export function appointmentStatusVariant(status: string | null): StatusVariant {
  switch (status) {
    case "completed":
      return "positive";
    case "planned":
      return "info";
    case "cancelled":
      return "danger";
    case "no_show":
      return "warning";
    default:
      return "secondary";
  }
}
