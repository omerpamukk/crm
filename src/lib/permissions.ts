import type { UserRole } from "@/types/database";

/**
 * Firma içi rol/yetki sistemi.
 *
 * Platform admin tarafındaki `admin-perms.ts` ile aynı desende, ama bu
 * işletmenin kendi kullanıcıları için. Saf sabit — hem server hem client
 * tarafında güvenle import edilebilir.
 *
 * Kaynak doğruluk: veritabanı tarafında `0015_roles.sql` içindeki
 * `can_see_finance()` ve RLS politikaları. Buradaki kontroller ikinci
 * savunma hattı ve menü/arayüz gizleme içindir.
 */

export const ROLES = [
  {
    key: "owner",
    label: "Yönetici",
    desc: "Tüm yetkilere sahip — finans, raporlar, ayarlar dahil",
  },
  {
    key: "reception",
    label: "Resepsiyon",
    desc: "Müşteri, randevu ve tahsilat yönetir; gider ve raporları göremez",
  },
  {
    key: "specialist",
    label: "Uzman",
    desc: "Yalnızca kendi randevularını ve kendi hakedişini görür",
  },
] as const satisfies readonly { key: UserRole; label: string; desc: string }[];

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Yönetici",
  reception: "Resepsiyon",
  specialist: "Uzman",
};

/** Korunan yetenekler. Menü öğeleri ve server action'lar bunlara bakar. */
export type Capability =
  | "finans" // gider, kâr/zarar, komisyon tutarları
  | "raporlar" // raporlar ve yönetici paneli
  | "ayarlar" // işletme ayarları, entegrasyonlar
  | "personel_yonet" // personel ekle/düzenle/sil
  | "musteri_yonet" // müşteri ekle/düzenle/sil
  | "randevu_yonet" // randevu ekle/düzenle/sil
  | "tahsilat" // ödeme alma
  | "tum_randevular"; // sadece kendi randevuları değil, hepsi

const MATRIX: Record<UserRole, Capability[]> = {
  owner: [
    "finans",
    "raporlar",
    "ayarlar",
    "personel_yonet",
    "musteri_yonet",
    "randevu_yonet",
    "tahsilat",
    "tum_randevular",
  ],
  reception: ["musteri_yonet", "randevu_yonet", "tahsilat", "tum_randevular"],
  specialist: [],
};

/** Bu rol verilen yeteneğe sahip mi? */
export function can(role: UserRole | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(cap) ?? false;
}

/**
 * Server action kapısı. Yetki yoksa fırlatır.
 * Kullanım: `assertCan(role, "finans")`
 */
export function assertCan(role: UserRole | null | undefined, cap: Capability): void {
  if (!can(role, cap)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

/** Yetki yoksa action'lardan dönen standart hata nesnesi. */
export function denied(): { error: string } {
  return { error: "Bu işlem için yetkiniz yok." };
}
