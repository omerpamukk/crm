import type { UserRole } from "@/types/database";
import { can } from "@/lib/permissions";

/**
 * Randevu durum geçişleri ve "Geldi" (arrived) iş kuralları. Saf mantık:
 * server action, otomasyon planlayıcısı ve testler aynı kaynağı kullanır.
 *
 * Akış: Planlandı (planned) -> Geldi (arrived) -> Tamamlandı (completed).
 * Seans düşümü ve last_visit_at yalnızca 'completed' geçişinde olur (0003
 * tetikleyicisi); gelir/tahsilat da yalnızca 'completed' randevudan doğar.
 * 'arrived' bunların hiçbirini tetiklemez.
 */

/** Geldi olarak işaretlenebilir mi? Yalnızca planlı randevu. */
export function canMarkArrived(status: string | null | undefined): boolean {
  return (status ?? "planned") === "planned";
}

/** Geldi geri alınabilir mi? Yalnızca Geldi durumundaki randevu. */
export function canUndoArrived(status: string | null | undefined): boolean {
  return status === "arrived";
}

/**
 * Randevu hatırlatması ("randevunuzu unutmayın") yalnızca bu durumdaki
 * randevulara gider. Gelmiş/tamamlanmış/iptal/gelmedi randevuya mesaj gitmez.
 */
export const REMINDABLE_STATUSES = ["planned"] as const;

export function isRemindable(status: string | null | undefined): boolean {
  return (REMINDABLE_STATUSES as readonly string[]).includes(status ?? "planned");
}

/** Saati/kabini dolu tutan durumlar (çakışma ve online müsaitlik). 0028 ile eşleşir. */
export const SLOT_HOLDING_STATUSES = ["planned", "arrived"] as const;

/**
 * Kim işaretleyebilir: randevu yönetebilen roller (yönetici, resepsiyon)
 * her randevuyu; uzman yalnızca kendi personel kaydına bağlı randevuyu.
 */
export function canChangeArrival(
  role: UserRole | null | undefined,
  profileStaffId: string | null | undefined,
  appointmentStaffMemberId: string | null | undefined
): boolean {
  if (can(role, "randevu_yonet")) return true;
  return (
    role === "specialist" &&
    !!profileStaffId &&
    profileStaffId === appointmentStaffMemberId
  );
}
