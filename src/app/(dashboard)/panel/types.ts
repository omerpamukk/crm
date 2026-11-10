export type ApptStatus = "planned" | "arrived" | "completed" | "cancelled" | "no_show";

/** Bugünün programındaki tek randevu (istemciye giden düz veri). */
export type ScheduleAppt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ApptStatus;
  arrivedAt: string | null;
  customerId: string | null;
  customerName: string;
  tags: string[];
  service: string;
  staffId: string | null;
  staffName: string;
  staffTitle: string;
  pkgUsed: number | null;
  pkgTotal: number | null;
  /** Müşterinin açık borcu (₺); 0 = yok. */
  debt: number;
  debtOverdue: boolean;
  /** Bu kullanıcı bu randevuyu Geldi olarak işaretleyebilir mi? */
  canArrive: boolean;
};
