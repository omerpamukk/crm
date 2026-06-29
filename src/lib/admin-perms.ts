/** Ajans admin yetki anahtarları — hem server hem client güvenli (saf sabit). */
export const ADMIN_PERMS = [
  { key: "goruntule", label: "Görüntüleyici olarak gir", desc: "Firmaları salt-okunur gezer" },
  { key: "yonet", label: "Yönetici olarak gir", desc: "Firmanın CRM'inde değişiklik yapar (yazma)" },
  { key: "firma_olustur", label: "Yeni firma oluştur", desc: "Yeni işletme + ilk kullanıcı açar" },
  { key: "firma_duzenle", label: "Firma bilgilerini düzenle", desc: "Ad, sektör, iletişim, ayarlar" },
  { key: "abonelik", label: "Abonelik yönet", desc: "Plan, ücret, askıya alma" },
  { key: "kullanici_yonet", label: "Firma kullanıcılarını yönet", desc: "Kullanıcı ekle/sil/rol/şifre" },
] as const;

export type AdminPerm = (typeof ADMIN_PERMS)[number]["key"];

/** Yeni ek admin için güvenli varsayılan: yalnızca salt-okunur görüntüleme. */
export const DEFAULT_ADMIN_PERMS: AdminPerm[] = ["goruntule"];

export const PERM_LABEL: Record<string, string> = Object.fromEntries(ADMIN_PERMS.map((p) => [p.key, p.label]));

/** Hazır rol şablonları — tek tıkla yetki seti. En düşük olan "personel" varsayılan. */
export const ADMIN_ROLE_PRESETS = [
  { key: "yonetici", label: "Yönetici", desc: "Ekip yönetimi hariç tüm yetkiler", tone: "bg-gradient-to-br from-primary to-violet-500 text-white", perms: ["goruntule", "yonet", "firma_olustur", "firma_duzenle", "abonelik", "kullanici_yonet"] as AdminPerm[] },
  { key: "operasyon", label: "Operasyon", desc: "Firma & kullanıcı yönetir; faturalama/oluşturma yok", tone: "bg-sky-100 text-sky-700", perms: ["goruntule", "yonet", "firma_duzenle", "kullanici_yonet"] as AdminPerm[] },
  { key: "satis", label: "Satış", desc: "Yeni firma açar, abonelik yönetir", tone: "bg-emerald-100 text-emerald-700", perms: ["goruntule", "firma_olustur", "abonelik"] as AdminPerm[] },
  { key: "destek", label: "Destek", desc: "Firmaya girip kullanıcı/şifre yardımı yapar", tone: "bg-amber-100 text-amber-700", perms: ["goruntule", "yonet", "kullanici_yonet"] as AdminPerm[] },
  { key: "personel", label: "Personel", desc: "Yalnızca salt-okunur görüntüleme", tone: "bg-muted text-muted-foreground", perms: ["goruntule"] as AdminPerm[] },
] as const;

/** Bir yetki setini en yakın hazır role eşler (rozet için). */
export function matchRolePreset(perms: string[]): string {
  const set = [...perms].sort().join(",");
  for (const r of ADMIN_ROLE_PRESETS) if ([...r.perms].sort().join(",") === set) return r.label;
  return perms.length === 0 ? "Yetkisiz" : "Özel yetki";
}
