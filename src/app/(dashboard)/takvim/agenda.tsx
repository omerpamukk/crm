"use client";

import { cn } from "@/lib/utils";
import { appointmentDotClass, appointmentTone } from "@/components/shared/appointment-block";
import { GeldiButton } from "@/components/shared/geldi-button";

import { StatusText, blockLabel, type Placed } from "./parts";
import { dayTitle, hhmm } from "./zaman";

export type AgendaActions = {
  tz: string;
  canArrive: (a: Placed) => boolean;
  onOpen: (a: Placed, el: HTMLElement) => void;
  onArrive: (a: Placed) => Promise<void>;
  onUndo: (a: Placed) => Promise<void>;
};

/** Telefondaki randevu satırı: saat · ad · hizmet/personel · Geldi ya da durum. */
function AgendaRow({ a, actions }: { a: Placed; actions: AgendaActions }) {
  const tone = appointmentTone(a.status);
  const showGeldi = actions.canArrive(a) && (tone === "planned" || tone === "arrived");
  const sub = [a.service_name, a.staff_name].filter(Boolean).join(" · ") || "Hizmet belirtilmedi";
  return (
    <li className="relative flex min-h-[64px] items-center">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={blockLabel(a)}
        onClick={(e) => actions.onOpen(a, e.currentTarget)}
        className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2.5 pr-2 pl-4 text-left transition-colors duration-150 hover:bg-hover active:bg-press focus-visible:outline-offset-[-3px]"
      >
        <span className="w-11 shrink-0 tabular-nums">
          <b className="block text-[0.9375rem] leading-5 font-semibold">{hhmm(a.startMin)}</b>
          <span className="block text-[0.75rem] leading-4 text-label-2">{hhmm(a.endMin)}</span>
        </span>
        <span aria-hidden className={cn("h-9 w-[3px] shrink-0 rounded-full", appointmentDotClass(tone))} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[0.9375rem] leading-5 font-medium", tone === "cancelled" && "text-label-2 line-through")}>
            {a.customer_name}
          </span>
          <span className="block truncate text-subhead text-label-2">{sub}</span>
        </span>
      </button>
      <span className="flex shrink-0 items-center pr-3 pl-1">
        {showGeldi ? (
          <GeldiButton
            className="h-11"
            customerName={a.customer_name}
            arrived={tone === "arrived"}
            onArrive={() => actions.onArrive(a)}
            onUndo={() => actions.onUndo(a)}
          />
        ) : tone !== "planned" ? (
          <StatusText a={a} tz={actions.tz} />
        ) : null}
      </span>
    </li>
  );
}

/** Bir günün listesi (başlık + satırlar). Boş gün tek satırlık not olur. */
export function AgendaDay({
  dayKey,
  todayKey,
  items,
  actions,
  title,
  emptyText = "Randevu yok",
}: {
  dayKey: string;
  todayKey: string;
  items: Placed[];
  actions: AgendaActions;
  /** Varsayılan: "5 Kasım Perşembe". */
  title?: string;
  emptyText?: string;
}) {
  const isToday = dayKey === todayKey;
  return (
    <section aria-label={title ?? dayTitle(dayKey, todayKey)} className="min-w-0">
      <div className="mx-1 mb-2 flex min-w-0 items-center gap-2">
        <h3 className="section-title min-w-0 truncate">{title ?? dayTitle(dayKey, todayKey)}</h3>
        {isToday && (
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[0.75rem] font-semibold text-primary-text">
            Bugün
          </span>
        )}
        <span className="ml-auto shrink-0 text-subhead whitespace-nowrap text-label-2">
          {items.length ? `${items.length} randevu` : emptyText}
        </span>
      </div>
      {items.length > 0 && (
        <div className="surface overflow-clip">
          <ul className="inset-rows" style={{ "--row-inset": "76px" } as React.CSSProperties}>
            {items.map((a) => (
              <AgendaRow key={a.id} a={a} actions={actions} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Yükleniyor: liste iskeleti. */
export function AgendaSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="skeleton mx-1 h-5 w-40" />
      <div className="surface overflow-clip">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex min-h-[64px] items-center gap-3 px-4">
            <div className="skeleton h-8 w-10" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-2/5" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
