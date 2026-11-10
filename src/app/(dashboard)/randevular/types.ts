import type { Appointment } from "@/types/database";

/** Listede gösterilen randevu: müşteri, hizmet ve uzman adlarıyla birlikte. */
export type AppointmentRow = Appointment & {
  customer: { full_name: string; phone: string | null } | null;
  service: { name: string; duration_min: number | null } | null;
  staff_member: { full_name: string } | null;
};

/** Rolün bu randevu üzerinde neleri yapabildiği (arayüz kapısı; asıl koruma sunucuda). */
export type RowPermissions = {
  /** Geldi / Tamamlandı / Gelmedi. */
  arrival: boolean;
  /** İptal, Düzenle, Sil. */
  manage: boolean;
};

/** Satır eylemlerini yürüten işlevler (use-appointment-actions). */
export type RowHandlers = {
  /** İşlem başarılıysa true; hata bildirimi gösterilmiştir. */
  onArrive: (a: AppointmentRow) => Promise<boolean>;
  onUndoArrive: (a: AppointmentRow) => Promise<boolean>;
  onComplete: (a: AppointmentRow) => void;
  onNoShow: (a: AppointmentRow) => void;
  onCancel: (a: AppointmentRow) => void;
  onEdit: (a: AppointmentRow) => void;
  onDelete: (a: AppointmentRow) => void;
};
