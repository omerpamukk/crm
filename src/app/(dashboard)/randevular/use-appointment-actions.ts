"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { toastUndo } from "@/components/ui/sonner";

import {
  deleteAppointment,
  markArrived,
  setAppointmentStatus,
  undoArrived,
  type QuickStatus,
} from "./actions";
import type { AppointmentRow } from "./types";

const nameOf = (a: AppointmentRow) => a.customer?.full_name ?? "Müşteri";

/**
 * Satır eylemlerinin sunucu çağrıları ve bildirimleri. Hata olursa mesajı
 * gösterir ve false döner; sayfa verisi action içindeki revalidatePath ile
 * kendiliğinden tazelenir.
 */
export function useAppointmentActions() {
  const undoArrive = useCallback(async (a: AppointmentRow): Promise<boolean> => {
    const res = await undoArrived(a.id);
    if (res.error) {
      toast.error(res.error);
      return false;
    }
    toast.success(`${nameOf(a)}: Geldi geri alındı`);
    return true;
  }, []);

  const arrive = useCallback(
    async (a: AppointmentRow): Promise<boolean> => {
      const res = await markArrived(a.id);
      if (res.error) {
        toast.error(res.error);
        return false;
      }
      toastUndo(`${nameOf(a)} geldi`, () => {
        void undoArrived(a.id).then((r) => {
          if (r.error) toast.error(r.error);
        });
      });
      return true;
    },
    []
  );

  const setStatus = useCallback(
    async (a: AppointmentRow, status: Exclude<QuickStatus, "planned">): Promise<boolean> => {
      const res = await setAppointmentStatus(a.id, status);
      if (res.error) {
        toast.error(res.error);
        return false;
      }
      const message = {
        completed: `${nameOf(a)}: Tamamlandı`,
        no_show: `${nameOf(a)}: Gelmedi`,
        cancelled: `${nameOf(a)}: İptal edildi`,
      }[status];
      // Yalnızca planlı randevudan yapılan Gelmedi / İptal edildi geri alınabilir;
      // Tamamlandı seans düşürdüğü için burada geri alma sunulmaz.
      if (status !== "completed" && (a.status ?? "planned") === "planned") {
        toastUndo(message, () => {
          void setAppointmentStatus(a.id, "planned").then((r) => {
            if (r.error) toast.error(r.error);
          });
        });
      } else {
        toast.success(message);
      }
      return true;
    },
    []
  );

  const remove = useCallback(async (a: AppointmentRow): Promise<boolean> => {
    const res = await deleteAppointment(a.id);
    if (res.error) {
      toast.error("Randevu silinemedi. Sayfayı yenileyip tekrar deneyin.");
      return false;
    }
    toast.success("Randevu silindi");
    return true;
  }, []);

  return { arrive, undoArrive, setStatus, remove };
}
