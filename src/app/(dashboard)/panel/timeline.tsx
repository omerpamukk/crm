"use client";

import * as React from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { LocateFixed } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMotionPreset } from "@/lib/motion";
import { appointmentStatusLabel } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppointmentBlock } from "@/components/shared/appointment-block";

import { fmtTime, trMinutes } from "./dates";
import { apptLine } from "./appt-parts";
import type { ScheduleAppt } from "./types";

const HOUR = 150; // 1 saat = 150px
const LANE_H = 62;
const RULER_H = 30;
const MIN_BLOCK = 64;

type Lane = { key: string; name: string; title: string; items: ScheduleAppt[] };

/**
 * Çizelge: uzmanlar satır satır, saatler yatay, kırmızı "şu an" çizgisi.
 * Sürükleyerek (ivmeli), yatay tekerlek/Shift+tekerlek ve ← → tuşlarıyla kayar.
 * Bloğa basınca randevu ayrıntısı açılır (`onOpen`).
 */
export function Timeline({
  appts,
  now,
  nextId,
  onOpen,
}: {
  appts: ScheduleAppt[];
  now: number;
  nextId: string | null;
  onOpen: (id: string) => void;
}) {
  const { transition } = useMotionPreset();
  const viewRef = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [viewW, setViewW] = React.useState(0);
  const dragged = React.useRef(false);
  const placed = React.useRef(false);

  const lanes = React.useMemo<Lane[]>(() => {
    const map = new Map<string, Lane>();
    for (const a of appts) {
      const key = a.staffId ?? "none";
      const lane = map.get(key) ?? { key, name: a.staffName || "Atanmamış", title: a.staffTitle, items: [] };
      lane.items.push(a);
      map.set(key, lane);
    }
    return [...map.values()].sort((p, q) => p.name.localeCompare(q.name, "tr"));
  }, [appts]);

  const startMin = (a: ScheduleAppt) => trMinutes(new Date(a.startsAt).getTime());
  const durMin = (a: ScheduleAppt) => Math.max(15, Math.round((new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60000));

  // Saat aralığı: en az 09:00–19:00; randevular ve "şu an" dışarı taşarsa genişler
  const lo = Math.min(9 * 60, ...appts.map(startMin));
  const hi = Math.max(19 * 60, ...appts.map((a) => startMin(a) + durMin(a)));
  const T0 = Math.floor(lo / 60);
  const T1 = Math.min(24, Math.ceil(hi / 60));
  const trackW = (T1 - T0) * HOUR;
  const xOf = (min: number) => ((min - T0 * 60) / 60) * HOUR;
  const nowMin = trMinutes(now);
  const nowVisible = nowMin >= T0 * 60 && nowMin <= T1 * 60;
  const nowX = xOf(nowMin);

  const minX = Math.min(0, viewW - trackW);
  const clamp = React.useCallback((v: number) => Math.max(minX, Math.min(0, v)), [minX]);

  React.useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scrollTo = React.useCallback(
    (target: number) => {
      animate(x, clamp(target), transition("default"));
    },
    [clamp, transition, x]
  );

  // İlk yerleşim: "şu an" görünür olsun (ya da ilk randevuya yaklaş)
  React.useEffect(() => {
    if (placed.current || viewW === 0) return;
    placed.current = true;
    const focus = nowVisible ? nowX : appts.length ? xOf(startMin(appts[0])) : 0;
    x.set(clamp(-(focus - viewW * 0.3)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewW]);

  // Yatay tekerlek / Shift+tekerlek (dikey kaydırma sayfada kalır)
  React.useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!d) return;
      e.preventDefault();
      x.stop();
      x.set(clamp(x.get() - d));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp, x]);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? viewW * 0.8 : HOUR;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollTo(x.get() + step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollTo(x.get() - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      scrollTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      scrollTo(-trackW);
    }
  }

  const hours = Array.from({ length: T1 - T0 + 1 }, (_, i) => T0 + i);

  return (
    <div>
      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] py-1 lg:grid-cols-[8.875rem_minmax(0,1fr)]">
        <div style={{ paddingTop: RULER_H }}>
          {lanes.map((l) => (
            <div key={l.key} className="flex items-center gap-2.5 pr-2 pl-4" style={{ height: LANE_H }}>
              <Avatar name={l.name} size="sm" className="max-lg:hidden" />
              <div className="min-w-0">
                <div className="truncate text-[0.8125rem] leading-[17px] font-semibold" title={l.name}>{l.name}</div>
                {l.title && <div className="truncate text-[0.75rem] leading-4 text-label-2" title={l.title}>{l.title}</div>}
              </div>
            </div>
          ))}
        </div>
        <div
          ref={viewRef}
          tabIndex={0}
          role="group"
          aria-label="Bugünün programı çizelgesi. Sağa sola sürükleyin ya da ok tuşlarıyla kaydırın."
          onKeyDown={onKeyDown}
          className="relative cursor-grab touch-pan-y overflow-hidden rounded-[10px] select-none active:cursor-grabbing"
        >
          <motion.div
            className="relative"
            style={{ x, width: trackW }}
            drag="x"
            dragConstraints={{ left: minX, right: 0 }}
            dragElastic={0.1}
            dragTransition={{ power: 0.25, timeConstant: 260 }}
            onDragStart={() => {
              dragged.current = true;
            }}
            onDragEnd={() => {
              window.setTimeout(() => {
                dragged.current = false;
              }, 0);
            }}
          >
            <div className="relative" style={{ height: RULER_H }}>
              {hours.map((h) => {
                const left = (h - T0) * HOUR;
                if (h >= T1 || (nowVisible && Math.abs(left - nowX) < 36)) return null;
                return (
                  <span
                    key={h}
                    className="absolute top-1.5 text-[0.75rem] font-medium whitespace-nowrap text-label-2 tabular-nums"
                    style={h === T0 ? { left, paddingLeft: 6 } : { left, transform: "translateX(-50%)" }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </span>
                );
              })}
            </div>
            {hours.map((h) => (
              <React.Fragment key={h}>
                <span aria-hidden className="absolute bg-separator" style={{ left: (h - T0) * HOUR, top: RULER_H - 4, bottom: 0, width: 1 }} />
                {h < T1 && (
                  <span aria-hidden className="absolute bg-separator opacity-50" style={{ left: (h - T0) * HOUR + HOUR / 2, top: RULER_H - 4, bottom: 0, width: 1 }} />
                )}
              </React.Fragment>
            ))}
            {lanes.map((l, i) => (
              <div key={l.key} className={cn("relative", i > 0 && "border-t border-separator")} style={{ height: LANE_H }}>
                {l.items.map((a) => {
                  const left = xOf(startMin(a));
                  const w = Math.max(MIN_BLOCK, (durMin(a) / 60) * HOUR - 3);
                  const isNext = a.id === nextId;
                  return (
                    <AppointmentBlock
                      key={a.id}
                      status={a.status}
                      highlight={isNext}
                      title={a.customerName}
                      detail={`${fmtTime(a.startsAt)}–${fmtTime(a.endsAt)} · ${a.service}`}
                      aria-label={`${fmtTime(a.startsAt)} ${a.customerName}, ${appointmentStatusLabel(a.status)}, ${apptLine(a)}`}
                      hint={`${fmtTime(a.startsAt)}–${fmtTime(a.endsAt)} ${a.customerName} · ${apptLine(a)}`}
                      onClick={() => {
                        if (dragged.current) return;
                        onOpen(a.id);
                      }}
                      className="absolute top-[5px] bottom-[5px]"
                      style={{ left, width: w }}
                    />
                  );
                })}
              </div>
            ))}
            {nowVisible && (
              <div
                aria-hidden
                className="pointer-events-none absolute z-[2] w-0.5 -translate-x-1/2 rounded-full bg-danger"
                style={{ left: nowX, top: RULER_H - 8, bottom: 0 }}
              >
                <span className="absolute -top-[18px] left-1/2 grid h-[18px] -translate-x-1/2 place-items-center rounded-full bg-danger px-1.5 text-[0.6875rem] font-bold text-danger-foreground tabular-nums">
                  {fmtTime(now)}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-separator py-2 pr-3 pl-4 text-subhead whitespace-nowrap text-label-2">
        <span className="min-w-0 truncate">Bloğa basın: ayrıntı ve Geldi</span>
        {nowVisible && (
          <Button variant="secondary" size="sm" onClick={() => scrollTo(-(nowX - viewW / 2))}>
            <LocateFixed />
            Şimdi
          </Button>
        )}
      </div>
    </div>
  );
}
