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
  if (status === "archived") return "Arşiv";
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
    case "archived":
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

/** Paket ödeme durumları. */
export const PAYMENT_STATUSES = [
  { value: "odenmedi", label: "Ödenmedi" },
  { value: "kismi", label: "Kısmi" },
  { value: "odendi", label: "Ödendi" },
] as const;

export function paymentStatusLabel(status: string | null): string {
  return PAYMENT_STATUSES.find((s) => s.value === status)?.label ?? "—";
}

export function paymentStatusVariant(status: string | null): StatusVariant {
  switch (status) {
    case "odendi":
      return "positive";
    case "kismi":
      return "warning";
    case "odenmedi":
      return "danger";
    default:
      return "secondary";
  }
}

/** Ödeme durumunu her zaman fiyat/ödenen oranından türetir (UI veriyle çelişmesin). */
export function derivePaymentStatus(
  price: number | null,
  paid: number | null
): "odendi" | "kismi" | "odenmedi" {
  const p = paid ?? 0;
  if (p <= 0) return "odenmedi";
  if (price == null) return "odendi";
  if (p >= price) return "odendi";
  return "kismi";
}

/** Tahsilat yöntemleri. */
export const PAYMENT_METHODS = [
  { value: "nakit", label: "Nakit" },
  { value: "kart", label: "Kart" },
  { value: "havale", label: "Havale" },
  { value: "diger", label: "Diğer" },
] as const;

export function paymentMethodLabel(method: string | null): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "—";
}

export function paymentMethodVariant(method: string | null): StatusVariant {
  switch (method) {
    case "nakit":
      return "positive";
    case "kart":
      return "info";
    case "havale":
      return "warning";
    default:
      return "secondary";
  }
}

/** Gider kategorileri. */
export const EXPENSE_CATEGORIES = [
  { value: "kira", label: "Kira" },
  { value: "maas", label: "Maaş / Personel" },
  { value: "malzeme", label: "Malzeme / Stok" },
  { value: "fatura", label: "Fatura (elektrik, su, internet...)" },
  { value: "pazarlama", label: "Pazarlama / Reklam" },
  { value: "vergi", label: "Vergi / Resmi" },
  { value: "diger", label: "Diğer" },
] as const;

export function expenseCategoryLabel(category: string | null): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? "Diğer";
}

export function expenseCategoryVariant(category: string | null): StatusVariant {
  switch (category) {
    case "kira":
      return "info";
    case "maas":
      return "warning";
    case "malzeme":
      return "secondary";
    case "fatura":
      return "info";
    case "pazarlama":
      return "positive";
    case "vergi":
      return "danger";
    default:
      return "secondary";
  }
}

/** Ajans paneline açılabilecek bölümler. */
export const AGENCY_SECTIONS = [
  { key: "kazanc", label: "Kazanç İstatistikleri", desc: "Dönemsel gelir grafikleri", emoji: "📊" },
  { key: "ciro_netkar", label: "Toplam Ciro & Net Kâr", desc: "Finansal özet kartları", emoji: "💰" },
  { key: "musteri_hizmet", label: "Müşteri & Hizmet Sayısı", desc: "Toplam müşteri, satılan hizmet", emoji: "👥" },
  { key: "aylik_grafik", label: "Aylık Ciro / Müşteri Grafiği", desc: "Trend çizgi grafikleri", emoji: "📈" },
  { key: "hizmet_karlilik", label: "Hizmet Bazlı Kârlılık", desc: "Hangi hizmet ne kazandırıyor", emoji: "🥧" },
  { key: "kaynak_gelir", label: "Kaynak Bazlı Gelir", desc: "Instagram, WhatsApp, Web...", emoji: "🌐" },
  { key: "gelir_girisi", label: "Gelir Girişi", desc: "Son gelir kayıtları", emoji: "🟢" },
  { key: "aylik_gider", label: "Aylık Giderler", desc: "Gider takibi", emoji: "🧾" },
  { key: "reklam_kampanya", label: "Reklam & Kampanya Verileri", desc: "Meta reklam istatistikleri", emoji: "📣" },
  { key: "potansiyel", label: "Potansiyel Müşteri Verileri", desc: "Lead listesi ve dönüşümler", emoji: "✨" },
] as const;

export const AGENCY_PERMISSIONS = [
  { value: "view", label: "Sadece Görüntüleme" },
  { value: "view_report", label: "Görüntüleme + Rapor" },
] as const;

export function agencyPermissionLabel(p: string | null): string {
  return AGENCY_PERMISSIONS.find((x) => x.value === p)?.label ?? "—";
}

export const AGENCY_DURATIONS = [
  { value: "30", label: "1 Ay" },
  { value: "90", label: "3 Ay" },
  { value: "180", label: "6 Ay" },
  { value: "365", label: "1 Yıl" },
  { value: "0", label: "Süresiz" },
] as const;
