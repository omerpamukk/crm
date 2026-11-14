/**
 * Açılıp kapatılabilen modüller (0036 businesses.enabled_modules).
 *
 * Çekirdek (Genel Bakış, Takvim, Randevular, Müşteriler, Satışlar, Cari,
 * Raporlar, Hizmetler, Personel, Giderler, Hatırlatmalar, Lead'ler, Gelir
 * Fırsatları) her zaman açıktır. Bunlar ise işletmenin işine göre açılır;
 * yeni işletme de hepsi açık başlar; kullanmadığını Ayarlar → Modüller'den kapatır.
 *
 * enabled_modules null = eski işletme: modül ayrımı gelmeden önce her şeyi
 * görüyordu, görmeye devam eder.
 */

export const MODULES = [
  { key: "paketler", label: "Paketler ve seans takibi", hint: "Seanslık paket satıyorsanız: kalan seans, paket bitiyor uyarısı." },
  { key: "randevu_linki", label: "Online randevu linki", hint: "Müşteriler boş saatleri görüp kendi randevusunu alır." },
  { key: "stok", label: "Stok", hint: "Ürün satıyor ya da malzeme takibi yapıyorsanız." },
  { key: "gorevler", label: "Görevler", hint: "Ekip içi iş takibi panosu." },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

/** Hangi sayfa hangi modüle bağlı. */
export const MODULE_OF_PATH: Record<string, ModuleKey> = {
  "/paketler": "paketler",
  "/randevu-linki": "randevu_linki",
  "/stok": "stok",
  "/gorevler": "gorevler",
};

export function isModuleEnabled(enabled: readonly string[] | null | undefined, key: ModuleKey): boolean {
  return enabled == null || enabled.includes(key);
}

export function moduleForPath(pathname: string): ModuleKey | null {
  for (const [href, key] of Object.entries(MODULE_OF_PATH)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return key;
  }
  return null;
}

/** Yalnızca bilinen anahtarlar, tekrarsız. */
export function cleanModules(input: readonly string[]): ModuleKey[] {
  return MODULE_KEYS.filter((k) => input.includes(k));
}
