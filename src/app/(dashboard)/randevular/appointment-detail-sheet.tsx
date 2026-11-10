"use client";

import { Ban, CircleCheck, Pencil, Trash2, UserX } from "lucide-react";

import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GeldiButton } from "@/components/shared/geldi-button";
import { Money } from "@/components/shared/money";
import { StatusBadge, StatusIcons } from "@/components/shared/status";

import { AppointmentReminder } from "./appointment-reminder";
import { rowAvailability } from "./appointment-row-actions";
import { reject } from "./reject";
import type { AppointmentRow, RowHandlers, RowPermissions } from "./types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-subhead whitespace-nowrap text-label-2">{label}</dt>
      <dd className="min-w-0 text-right text-[0.9375rem]">{children}</dd>
    </div>
  );
}

/**
 * Telefonda satıra dokununca açılan ayrıntı: bütün satır eylemleri burada,
 * görünür ve büyük düğmelerle. Kaydırarak Geldi demenin görünür karşılığıdır.
 */
export function AppointmentDetailSheet({
  appointment: a,
  open,
  onOpenChange,
  permissions,
  handlers,
}: {
  appointment: AppointmentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: RowPermissions;
  handlers: RowHandlers;
}) {
  const av = a ? rowAvailability(a, permissions) : null;
  const name = a?.customer?.full_name ?? "Müşteri";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" detents={[0.62, 0.92]}>
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>
            {a
              ? `${new Date(a.starts_at).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} · ${formatTime(a.starts_at)}`
              : "Randevu"}
          </SheetDescription>
        </SheetHeader>
        {a && av && (
          <>
            <dl className="mx-4 divide-y divide-separator">
              <Field label="Durum">
                <StatusBadge
                  variant={appointmentStatusVariant(a.status)}
                  icon={a.status === "cancelled" ? StatusIcons.cancelled : undefined}
                >
                  {a.status === "arrived" && a.arrived_at
                    ? `Geldi · ${formatTime(a.arrived_at)}`
                    : appointmentStatusLabel(a.status ?? "planned")}
                </StatusBadge>
              </Field>
              <Field label="Hizmet">{a.service?.name ?? "—"}</Field>
              <Field label="Personel">{a.staff_member?.full_name ?? "—"}</Field>
              <Field label="Ücret">
                {a.price != null ? <Money amount={a.price} /> : "—"}
              </Field>
              {a.note && <Field label="Not">{a.note}</Field>}
            </dl>

            <div className="space-y-2 px-4 pt-4 pb-5">
              {(av.arrive || av.undoArrive) && (
                <GeldiButton
                  size="lg"
                  className="w-full"
                  customerName={name}
                  arrived={a.status === "arrived"}
                  onArrive={() => reject(handlers.onArrive(a))}
                  onUndo={() => reject(handlers.onUndoArrive(a))}
                />
              )}
              {(av.complete || av.noShow) && (
                <div className="grid grid-cols-2 gap-2">
                  {av.complete && (
                    <Button variant="secondary" size="lg" onClick={() => handlers.onComplete(a)}>
                      <CircleCheck />
                      Tamamlandı
                    </Button>
                  )}
                  {av.noShow && (
                    <Button variant="secondary" size="lg" onClick={() => handlers.onNoShow(a)}>
                      <UserX />
                      Gelmedi
                    </Button>
                  )}
                </div>
              )}
              {av.remind && (
                <AppointmentReminder
                  className="w-full"
                  phone={a.customer?.phone ?? null}
                  customerName={name}
                  startsAt={a.starts_at}
                  serviceName={a.service?.name ?? null}
                />
              )}
              {(av.edit || av.cancel) && (
                <div className="grid grid-cols-2 gap-2">
                  {av.edit && (
                    <Button variant="secondary" size="lg" onClick={() => handlers.onEdit(a)}>
                      <Pencil />
                      Düzenle
                    </Button>
                  )}
                  {av.cancel && (
                    <Button variant="secondary" size="lg" onClick={() => handlers.onCancel(a)}>
                      <Ban />
                      İptal et
                    </Button>
                  )}
                </div>
              )}
              {av.remove && (
                <Button variant="destructive" size="lg" className="w-full" onClick={() => handlers.onDelete(a)}>
                  <Trash2 />
                  Sil
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
