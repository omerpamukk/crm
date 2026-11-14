/**
 * Açılıp kapatılabilen modüller (0036 businesses.enabled_modules).
 *
 * Çekirdek (Genel Bakış, Takvim, Randevular, Müşteriler, Satışlar, Raporlar,
 * Hizmetler, Personel) her işletmede açıktır. Geri kalanı işletmenin işine
 * göre açılır: yeni firma, sektörüne göre hazır bir setle başlar
 * (SECTOR_PRESETS); sahibi Ayarlar → Modüller'den, ajans firma sayfasından
 * değiştirir. Böylece lead kavramını bilmeyen bir kuaför "Lead'ler"i hiç
 * görmez, klinik görür.
 *
 * enabled_modules null = eski işletme: modül ayrımı gelmeden önce her şeyi
 * görüyordu, görmeye devam eder.
 *
 * İlk sürümde (paketler, randevu_linki, stok, gorevler) Lead'ler, Gelir
 * Fırsatları, Hatırlatmalar, Cari Hesap ve Giderler çekirdekti. O sürümde
 * kaydedilmiş bir listede bunlar yazmaz ama açık sayılmalıdır; yeni sürümde
 * kaydedilen her liste VERSION_MARK taşır ve bu ayrımı yapar.
 */

export const MODULES = [
  { key: "leadler", label: "Lead'ler", hint: "Reklamdan, telefondan gelen ama henüz müşteri olmayan kişileri aşama aşama takip edin." },
  { key: "firsatlar", label: "Gelir Fırsatları", hint: "Gelmeyi bırakan, borcu olan, paketi biten müşterileri tek listede görün." },
  { key: "kampanyalar", label: "Kampanyalar", hint: "Seçtiğiniz müşteri grubuna tek seferde SMS gönderin." },
  { key: "hatirlaticilar", label: "Hatırlatmalar", hint: "Randevu, doğum günü, paket bitiyor gibi otomatik mesajlar." },
  { key: "paketler", label: "Paketler", hint: "Seanslık paket satıyorsanız: kalan seans, paket bitiyor uyarısı." },
  { key: "cari", label: "Cari Hesap", hint: "Veresiye ve taksitli satışlarda kimin ne kadar borcu var." },
  { key: "randevu_linki", label: "Randevu Linki", hint: "Müşteriler boş saatleri görüp kendi randevusunu alır." },
  { key: "stok", label: "Stok", hint: "Ürün satıyor ya da malzeme takibi yapıyorsanız." },
  { key: "gorevler", label: "Görevler", hint: "Ekip içi iş takibi panosu." },
  { key: "giderler", label: "Giderler", hint: "Kira, maaş, malzeme gibi giderleri yazın, kârı görün." },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

/** Listenin yeni sürümde kaydedildiğini gösteren işaret (modül değildir). */
export const VERSION_MARK = "v2";

/** İlk sürümde her zaman açık olan, sonradan modül yapılanlar. */
const FORMERLY_CORE: readonly ModuleKey[] = ["leadler", "firsatlar", "hatirlaticilar", "cari", "giderler"];

/** Hangi sayfa hangi modüle bağlı. */
export const MODULE_OF_PATH: Record<string, ModuleKey> = {
  "/leadler": "leadler",
  "/firsatlar": "firsatlar",
  "/kampanyalar": "kampanyalar",
  "/hatirlaticilar": "hatirlaticilar",
  "/paketler": "paketler",
  "/cari": "cari",
  "/randevu-linki": "randevu_linki",
  "/stok": "stok",
  "/gorevler": "gorevler",
  "/giderler": "giderler",
};

export function isModuleEnabled(enabled: readonly string[] | null | undefined, key: ModuleKey): boolean {
  if (enabled == null) return true;
  if (enabled.includes(key)) return true;
  return !enabled.includes(VERSION_MARK) && FORMERLY_CORE.includes(key);
}

/** Açık modüllerin tam listesi (işaretten ve eski sürümden bağımsız). */
export function enabledModuleKeys(enabled: readonly string[] | null | undefined): ModuleKey[] {
  return MODULE_KEYS.filter((k) => isModuleEnabled(enabled, k));
}

export function moduleForPath(pathname: string): ModuleKey | null {
  for (const [href, key] of Object.entries(MODULE_OF_PATH)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return key;
  }
  return null;
}

/** Kaydedilecek liste: yalnızca bilinen anahtarlar, tekrarsız, sürüm işaretli. */
export function cleanModules(input: readonly string[]): string[] {
  return [...MODULE_KEYS.filter((k) => input.includes(k)), VERSION_MARK];
}

const BASE: ModuleKey[] = ["kampanyalar", "hatirlaticilar", "randevu_linki", "giderler"];

/** Sektöre göre başlangıç modülleri (firma açılırken işaretli gelir). */
export const SECTOR_PRESETS: Record<string, readonly ModuleKey[]> = {
  klinik: [...BASE, "leadler", "firsatlar", "paketler", "cari"],
  dis_klinigi: [...BASE, "leadler", "firsatlar", "cari"],
  estetik: [...BASE, "leadler", "firsatlar", "paketler", "cari"],
  guzellik_salonu: [...BASE, "firsatlar", "paketler", "cari"],
  kuafor: [...BASE, "cari"],
  berber: [...BASE],
  masaj_salonu: [...BASE, "paketler"],
  spor_salonu: ["kampanyalar", "hatirlaticilar", "paketler", "cari", "giderler"],
  danismanlik: [...BASE, "leadler", "cari"],
};

export function presetForSector(sector: string | null | undefined): ModuleKey[] {
  const preset = (sector && SECTOR_PRESETS[sector]) || BASE;
  return MODULE_KEYS.filter((k) => preset.includes(k));
}
