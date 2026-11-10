"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { AppointmentBlock, appointmentDotClass, appointmentTone } from "@/components/shared/appointment-block";

import { blockLabel, type Placed } from "./parts";
import { AY_UZUN, GUN_KISA, GUN_UZUN, hhmm, monthOf, weekdayOf } from "./zaman";

function dayName(key: string): string {
  const { m } = monthOf(key);
  return `${Number(key.slice(8))} ${AY_UZUN[m - 1]} ${GUN_UZUN[weekdayOf(key) - 1]}`;
}

function WeekdayHeader({ compact }: { compact?: boolean }) {
  return (
    <div className="grid grid-cols-7 border-b border-separator" aria-hidden>
      {GUN_KISA.map((d) => (
        <div
          key={d}
          className={cn(
            "text-[0.75rem] font-semibold text-label-2",
            compact ? "py-1.5 text-center" : "px-2.5 py-2"
          )}
        >
          {d}
        </div>
      ))}
    </div>
  );
}

/**
 * Ay görünümü (masaüstü): her günde çipler, sığmayanlar "+3 daha" ile o
 * günün Gün görünümüne gider. Gün numarası da o güne geçer. Bugün vurgulu.
 */
export function MonthGrid({
  weeks,
  month,
  todayKey,
  byDay,
  loading,
  selectedId,
  onOpen,
  onDay,
  overlay,
}: {
  weeks: string[][];
  /** Görüntülenen ay (1–12); dışındaki günler soluk. */
  month: number;
  todayKey: string;
  byDay: Map<string, Placed[]>;
  loading: boolean;
  selectedId: string | null;
  onOpen: (a: Placed, el: HTMLElement) => void;
  onDay: (key: string) => void;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="surface relative overflow-clip" role="group" aria-label="Ay takvimi" aria-busy={loading || undefined}>
      <WeekdayHeader />
      <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(7.25rem, 1fr)" }}>
        {weeks.flat().map((key, i) => {
          const inMonth = monthOf(key).m === month;
          const isToday = key === todayKey;
          const items = byDay.get(key) ?? [];
          const fits = items.length <= 3 ? items.length : 2;
          const more = items.length - fits;
          return (
            <div
              key={key}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 border-separator p-1.5",
                (i + 1) % 7 !== 0 && "border-r",
                i < weeks.length * 7 - 7 && "border-b",
                !inMonth && "bg-[color:var(--hover)]"
              )}
            >
              <button
                type="button"
                onClick={() => onDay(key)}
                aria-label={`${dayName(key)}${items.length ? `, ${items.length} randevu` : ""}. Günü aç`}
                className={cn(
                  "pressable mb-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums",
                  isToday
                    ? "bg-primary-fill text-on-primary-fill"
                    : inMonth
                      ? "text-label hover:bg-hover"
                      : "text-label-3 hover:bg-hover"
                )}
              >
                {Number(key.slice(8))}
              </button>
              {loading ? (
                i % 3 === 0 && <div aria-hidden className="skeleton h-[18px] w-4/5 rounded-[6px]" />
              ) : (
                <>
                  {items.slice(0, fits).map((a) => (
                    <AppointmentBlock
                      key={a.id}
                      status={a.status}
                      density="tiny"
                      title={
                        <>
                          <span className="font-semibold tabular-nums">{hhmm(a.startMin)}</span> {a.customer_name}
                        </>
                      }
                      selected={selectedId === a.id}
                      aria-label={`${dayName(key)}, ${blockLabel(a)}`}
                      aria-haspopup="dialog"
                      aria-expanded={selectedId === a.id}
                      hint={blockLabel(a)}
                      onClick={(e) => onOpen(a, e.currentTarget)}
                      className="h-[20px] w-full shrink-0"
                    />
                  ))}
                  {more > 0 && (
                    <button
                      type="button"
                      onClick={() => onDay(key)}
                      className="h-[20px] w-fit shrink-0 rounded-[6px] px-1.5 text-left text-[0.75rem] font-semibold whitespace-nowrap text-label-2 hover:bg-hover hover:text-primary-text"
                    >
                      +{more} daha
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {overlay}
    </div>
  );
}

/**
 * Ay görünümü (telefon): sıkı ızgara, günde en çok 3 durum noktası.
 * Güne dokununca o gün seçilir; liste ızgaranın altında görünür.
 */
export function MonthCompact({
  weeks,
  month,
  todayKey,
  selectedKey,
  byDay,
  loading,
  onSelect,
}: {
  weeks: string[][];
  month: number;
  todayKey: string;
  selectedKey: string;
  byDay: Map<string, Placed[]>;
  loading: boolean;
  onSelect: (key: string) => void;
}) {
  const days = weeks.flat();
  const group = React.useRef<HTMLDivElement>(null);
  const focusAfter = React.useRef(false);

  // Oklarla seçim değişince odak yeni güne geçsin
  React.useEffect(() => {
    if (!focusAfter.current) return;
    focusAfter.current = false;
    group.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [selectedKey]);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    const i = days.indexOf(selectedKey);
    const next = days[i + step];
    e.preventDefault();
    if (!next) return;
    focusAfter.current = true;
    onSelect(next);
  }

  return (
    <div className="surface overflow-clip px-1 pb-1" aria-busy={loading || undefined}>
      <WeekdayHeader compact />
      <div ref={group} className="grid grid-cols-7" role="radiogroup" aria-label="Gün seç" onKeyDown={onKeyDown}>
        {days.map((key) => {
          const inMonth = monthOf(key).m === month;
          const isToday = key === todayKey;
          const selected = key === selectedKey;
          const items = byDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              aria-label={`${dayName(key)}${items.length ? `, ${items.length} randevu` : ""}`}
              onClick={() => onSelect(key)}
              className="flex h-12 min-w-0 flex-col items-center justify-start gap-0.5 pt-1 focus-visible:outline-offset-[-3px]"
            >
              <span
                className={cn(
                  "grid size-[30px] place-items-center rounded-full text-[0.9375rem] tabular-nums transition-colors duration-150",
                  isToday && selected && "bg-primary-fill font-semibold text-on-primary-fill",
                  isToday && !selected && "font-semibold text-primary-text",
                  !isToday && selected && "bg-label font-semibold text-surface",
                  !isToday && !selected && (inMonth ? "text-label" : "text-label-3")
                )}
              >
                {Number(key.slice(8))}
              </span>
              <span aria-hidden className="flex h-1.5 items-center gap-[3px]">
                {!loading &&
                  items.slice(0, 3).map((a) => (
                    <span key={a.id} className={cn("size-[5px] rounded-full", appointmentDotClass(appointmentTone(a.status)))} />
                  ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
