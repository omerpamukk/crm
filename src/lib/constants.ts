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
