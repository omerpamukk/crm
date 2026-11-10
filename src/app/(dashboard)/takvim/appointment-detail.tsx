"use client";

import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { appointmentTone } from "@/components/shared/appointment-block";
import { GeldiButton } from "@/components/shared/geldi-button";

import { StatusText, timeSpan, type Placed } from "./parts";
import { dayTitle } from "./zaman";

/**
 * Randevu ayrıntısı: müşteri, hizmet, gün, saat, personel, durum; Geldi ve
 * Düzenle. Masaüstünde bloğun yanında açılır panelde, telefonda alt sayfada.
 */
export function AppointmentDetail({
  a,
  tz,
  todayKey,
  canArrive,
  canEdit,
  onArrive,
  onUndo,
  onEdit,
  variant,
}: {
  a: Placed;
  tz: string;
  todayKey: string;
  canArrive: boolean;
  canEdit: boolean;
  onArrive: () => Promise<void>;
  onUndo: () => Promise<void>;
  onEdit: () => void;
  /** popover: kompakt, başlık içeride · sheet: büyük düğmeler, başlık sayfada */
  variant: "popover" | "sheet";
}) {
  const tone = appointmentTone(a.status);
  const showGeldi = canArrive && (tone === "planned" || tone === "arrived");
  const big = variant === "sheet";

  const rows: [string, React.ReactNode][] = [
    ["Gün", dayTitle(a.dayKey, todayKey)],
    ["Saat", <span key="s" className="tabular-nums">{timeSpan(a).replace("–", " – ")}</span>],
    ["Personel", a.staff_name ?? "Atanmadı"],
    ["Durum", <StatusText key="d" a={a} tz={tz} />],
  ];
  if (a.note) rows.push(["Not", a.note]);

  return (
    <div className={cn(big ? "space-y-4 px-4 pb-5" : "space-y-3")}>
      {!big && (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={a.customer_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] leading-5 font-semibold">{a.customer_name}</p>
            <p className="truncate text-subhead text-label-2">{a.service_name ?? "Hizmet belirtilmedi"}</p>
          </div>
        </div>
      )}

      <dl
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4",
          big ? "gap-y-2.5 text-[0.9375rem]" : "gap-y-1.5 text-[0.875rem]"
        )}
      >
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="whitespace-nowrap text-label-2">{k}</dt>
            <dd className={cn("min-w-0", k === "Not" ? "line-clamp-3" : "truncate")}>{v}</dd>
          </div>
        ))}
      </dl>

      {(showGeldi || canEdit) && (
        <div className={cn("flex gap-2", big && "flex-col")}>
          {showGeldi && (
            <GeldiButton
              size={big ? "lg" : "md"}
              className={cn(big ? "w-full" : "flex-1")}
              customerName={a.customer_name}
              arrived={tone === "arrived"}
              onArrive={onArrive}
              onUndo={onUndo}
            />
          )}
          {canEdit && (
            <Button
              variant="secondary"
              size={big ? "lg" : "default"}
              className={cn(big ? "w-full" : "flex-1", !big && "h-[34px]")}
              onClick={onEdit}
            >
              <Pencil />
              Düzenle
            </Button>
          )}
        </div>
      )}

      {a.customer_id && (
        <Link
          href={`/musteriler/${a.customer_id}`}
          className={cn(
            "flex items-center justify-between gap-2 rounded-[10px] font-medium text-primary-text hover:bg-hover",
            big ? "min-h-11 px-1 text-[0.9375rem]" : "-mx-1 min-h-9 px-1 text-[0.875rem]"
          )}
        >
          Müşteri sayfası
          <ChevronRight aria-hidden className="size-4 text-label-3" />
        </Link>
      )}
    </div>
  );
}
