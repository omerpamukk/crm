"use client";

import {
  Ban,
  CircleCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Undo2,
} from "lucide-react";

import { canMarkArrived, canUndoArrived, isRemindable } from "@/lib/appointment-status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeldiButton } from "@/components/shared/geldi-button";

import { AppointmentReminder } from "./appointment-reminder";
import { reject } from "./reject";
import type { AppointmentRow, RowHandlers, RowPermissions } from "./types";

/** Satırda hangi eylemlerin açık olduğu (menü, detay ve kaydırma aynı kuralı kullanır). */
export function rowAvailability(a: AppointmentRow, p: RowPermissions) {
  const status = a.status ?? "planned";
  const open = status === "planned" || status === "arrived";
  return {
    arrive: p.arrival && canMarkArrived(status),
    undoArrive: p.arrival && canUndoArrived(status),
    complete: p.arrival && open,
    noShow: p.arrival && open,
    cancel: p.manage && open,
    edit: p.manage,
    remove: p.manage,
    remind: isRemindable(status),
  };
}

/**
 * Masaüstü satır eylemleri: Geldi düğmesi, WhatsApp hatırlatma ve ⋯ menüsü.
 * Rolün yapamadığı eylem görünmez.
 */
export function AppointmentRowActions({
  appointment: a,
  permissions,
  handlers,
}: {
  appointment: AppointmentRow;
  permissions: RowPermissions;
  handlers: RowHandlers;
}) {
  const av = rowAvailability(a, permissions);
  const name = a.customer?.full_name ?? "Müşteri";
  const hasMenu = av.arrive || av.undoArrive || av.complete || av.noShow || av.cancel || av.edit || av.remove;
  const showGeldi = av.arrive || av.undoArrive;

  return (
    <div className="flex items-center justify-end gap-1">
      {showGeldi && (
        <GeldiButton
          size="sm"
          customerName={name}
          arrived={a.status === "arrived"}
          onArrive={() => reject(handlers.onArrive(a))}
          onUndo={() => reject(handlers.onUndoArrive(a))}
        />
      )}
      {av.remind && (
        <AppointmentReminder
          iconOnly
          phone={a.customer?.phone ?? null}
          customerName={name}
          startsAt={a.starts_at}
          serviceName={a.service?.name ?? null}
        />
      )}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${name}: Randevu işlemleri`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            {av.arrive && (
              <DropdownMenuItem onSelect={() => void handlers.onArrive(a)}>
                <UserCheck />
                Geldi olarak işaretle
              </DropdownMenuItem>
            )}
            {av.undoArrive && (
              <DropdownMenuItem onSelect={() => void handlers.onUndoArrive(a)}>
                <Undo2 />
                Geldiyi geri al
              </DropdownMenuItem>
            )}
            {av.complete && (
              <DropdownMenuItem onSelect={() => handlers.onComplete(a)}>
                <CircleCheck />
                Tamamlandı olarak işaretle
              </DropdownMenuItem>
            )}
            {av.noShow && (
              <DropdownMenuItem onSelect={() => handlers.onNoShow(a)}>
                <UserX />
                Gelmedi olarak işaretle
              </DropdownMenuItem>
            )}
            {av.cancel && (
              <DropdownMenuItem onSelect={() => handlers.onCancel(a)}>
                <Ban />
                İptal et
              </DropdownMenuItem>
            )}
            {(av.edit || av.remove) && (av.arrive || av.undoArrive || av.complete || av.noShow || av.cancel) && (
              <DropdownMenuSeparator />
            )}
            {av.edit && (
              <DropdownMenuItem onSelect={() => handlers.onEdit(a)}>
                <Pencil />
                Düzenle
              </DropdownMenuItem>
            )}
            {av.remove && (
              <DropdownMenuItem variant="destructive" onSelect={() => handlers.onDelete(a)}>
                <Trash2 />
                Sil
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
