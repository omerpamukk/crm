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
