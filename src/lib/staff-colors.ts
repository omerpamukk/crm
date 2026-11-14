/**
 * Personel renkleri. Veritabanında ad saklanır (staff.color, 0042);
 * renk değerleri globals.css'teki --staff-* tokenlarındadır.
 * Renk yalnızca nokta/çizgi olarak kullanılır, yanında her zaman ad vardır.
 */
export const STAFF_COLORS = [
  { key: "indigo", label: "Çivit", dot: "bg-staff-indigo" },
  { key: "mavi", label: "Mavi", dot: "bg-staff-mavi" },
  { key: "turkuaz", label: "Turkuaz", dot: "bg-staff-turkuaz" },
  { key: "yesil", label: "Yeşil", dot: "bg-staff-yesil" },
  { key: "turuncu", label: "Turuncu", dot: "bg-staff-turuncu" },
  { key: "pembe", label: "Pembe", dot: "bg-staff-pembe" },
  { key: "mor", label: "Mor", dot: "bg-staff-mor" },
  { key: "kahve", label: "Kahve", dot: "bg-staff-kahve" },
] as const;

export type StaffColor = (typeof STAFF_COLORS)[number]["key"];

export const STAFF_COLOR_KEYS = STAFF_COLORS.map((c) => c.key) as [StaffColor, ...StaffColor[]];

export function isStaffColor(v: unknown): v is StaffColor {
  return typeof v === "string" && (STAFF_COLOR_KEYS as string[]).includes(v);
}

/** Nokta sınıfı; renk seçilmemişse gri. */
export function staffDotClass(color: string | null | undefined): string {
  return STAFF_COLORS.find((c) => c.key === color)?.dot ?? "bg-label-3";
}

/** Yeni personele sıradaki boş renk (hepsi kullanılıyorsa sıradan döner). */
export function nextStaffColor(used: (string | null | undefined)[]): StaffColor {
  const free = STAFF_COLORS.find((c) => !used.includes(c.key));
  return (free ?? STAFF_COLORS[used.length % STAFF_COLORS.length]).key;
}

/** Personelin verdiği hizmetler: boş liste = tüm hizmetler. */
export function staffDoesService(serviceIds: string[] | null | undefined, serviceId: string | null | undefined): boolean {
  if (!serviceId || !serviceIds || serviceIds.length === 0) return true;
  return serviceIds.includes(serviceId);
}
