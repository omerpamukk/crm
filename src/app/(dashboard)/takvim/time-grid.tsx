"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { AppointmentBlock } from "@/components/shared/appointment-block";

import { blockLabel, timeSpan, type Placed } from "./parts";
import { packOverlaps } from "./yerlesim";
import { hhmm } from "./zaman";

/** 1 saat = 64px: 30 dk tek satır, 45 dk ve üstü iki satır sığar. */
export const HOUR_PX = 64;
const PPM = HOUR_PX / 60;

export type GridColumn = {
  key: string;
  dayKey: string;
  /** Ekran okuyucu adı ("Merve Kaya", "Perşembe 5 Kasım"). */
  label: string;
  /** Sütun başlığı (masaüstü). */
  header?: React.ReactNode;
  items: Placed[];
  /** Soluk bölgeler (mesai dışı, izin), dakika. */
  off: [number, number][];
  /** Soluk bölgelerin üstüne küçük not ("Kapalı", "İzinli"). */
  notes?: { at: number; text: string }[];
  isToday: boolean;
};

/**
 * Dikey zaman ızgarası (Google Takvim gibi): solda saatler, her sütun bir
 * personel ya da gün. Çakışan bloklar yan yana sığar; bugünün sütununda kırmızı
 * "şu an" çizgisi. Masaüstünde ızgara kendi içinde kayar: başlık üstte,
 * saatler solda sabit kalır; çok sütun varsa yatay kaydırma bu alanın içinde.
 */
export function TimeGrid({
  columns,
  hours,
  nowMin,
  gutter = 56,
  minColWidth = 160,
  showHeader = true,
  fitViewport = false,
  loading = false,
  selectedId,
  initialsFor,
  onOpen,
  scrollKey,
  overlay,
  ariaLabel,
  className,
}: {
  columns: GridColumn[];
  hours: [number, number];
  nowMin: number | null;
  gutter?: number;
  minColWidth?: number;
  showHeader?: boolean;
  /** Masaüstü: ekran yüksekliğine sığ, içeride kay. */
  fitViewport?: boolean;
  loading?: boolean;
  selectedId: string | null;
  /** Blokta personelin baş harfleri (Tümü görünümü). */
  initialsFor?: (a: Placed) => string | null;
  onOpen: (a: Placed, el: HTMLElement) => void;
  /** Değişince ızgara "şu an"a ya da ilk randevuya kayar. */
  scrollKey: string;
  overlay?: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const [h0, h1] = hours;
  const from = h0 * 60;
  const to = h1 * 60;
  const height = (h1 - h0) * HOUR_PX;
  const scroller = React.useRef<HTMLDivElement>(null);
  const yOf = (min: number) => (min - from) * PPM;

  const todayCol = columns.some((c) => c.isToday);
  const nowVisible = nowMin !== null && todayCol && nowMin >= from && nowMin <= to;
  const nowY = nowVisible ? yOf(nowMin!) : 0;

  const firstStart = React.useMemo(() => {
    let min = Infinity;
    for (const c of columns) for (const a of c.items) min = Math.min(min, a.startMin);
    return Number.isFinite(min) ? min : null;
  }, [columns]);

  // İlk yerleşim (ve tarih değişince): "şu an" ya da ilk randevu görünür olsun
  const placedFor = React.useRef<string | null>(null);
  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !fitViewport || loading) return;
    if (placedFor.current === scrollKey) return;
    placedFor.current = scrollKey;
    if (el.scrollHeight <= el.clientHeight + 1) return;
    // Yapışkan başlık görünür alanın üstünü kaplar; hedef onun altında kalsın
    const header = showHeader ? 52 : 0;
    const target = nowVisible
      ? nowY - (el.clientHeight - header) * 0.3
      : firstStart !== null
        ? yOf(firstStart) - 24
        : 0;
    el.scrollTop = Math.max(0, target);
    // yOf saf; konum yalnızca anahtar değişince ayarlanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, loading, fitViewport]);

  const template = `${gutter}px repeat(${Math.max(1, columns.length)}, minmax(${minColWidth}px, 1fr))`;
  const lines: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(to bottom, var(--sep-strong) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--sep) 60%, transparent) 1px, transparent 1px)",
    backgroundSize: `100% ${HOUR_PX}px, 100% ${HOUR_PX}px`,
    backgroundPosition: `0 0, 0 ${HOUR_PX / 2}px`,
  };

  return (
    <div className={cn("surface relative overflow-clip", className)}>
      <div
        ref={scroller}
        role="group"
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        className={cn(
          "relative",
          // Masaüstü: kendi içinde kayar. Telefon (tek sütun): kaydırma kabı yok,
          // yatay kaydırma hareketi takvimin gün değiştirme jestine kalır.
          fitViewport
            ? "scrollbar-none max-h-[max(26rem,calc(100svh-var(--toolbar-h)-12.5rem))] overflow-auto overscroll-x-contain"
            : "overflow-visible"
        )}
      >
        <div className="grid" style={{ gridTemplateColumns: template }}>
          {showHeader && (
            <>
              <div className="sticky top-0 left-0 z-30 border-b border-separator bg-surface" />
              {columns.map((c) => (
                <div
                  key={`h-${c.key}`}
                  className="sticky top-0 z-20 flex min-h-[52px] min-w-0 items-center border-b border-l border-separator bg-surface px-3 py-2"
                >
                  {c.header}
                </div>
              ))}
            </>
          )}

          {/* Saat sütunu */}
          <div className="sticky left-0 z-10 bg-surface" style={{ height }} aria-hidden>
            {Array.from({ length: h1 - h0 }, (_, i) => {
              const y = i * HOUR_PX;
              if (nowVisible && Math.abs(y - nowY) < 14) return null;
              return (
                <span
                  key={i}
                  className={cn(
                    "absolute right-2 text-[0.75rem] leading-4 font-medium text-label-2 tabular-nums",
                    i === 0 ? "top-1" : "-translate-y-1/2"
                  )}
                  style={i === 0 ? undefined : { top: y }}
                >
                  {hhmm((h0 + i) * 60)}
                </span>
              );
            })}
            {nowVisible && (
              <span
                className="absolute right-1 z-10 grid h-[18px] -translate-y-1/2 place-items-center rounded-full bg-danger px-1.5 text-[0.6875rem] font-bold text-danger-foreground tabular-nums"
                style={{ top: nowY }}
              >
                {hhmm(nowMin!)}
              </span>
            )}
          </div>

          {columns.map((c, ci) => (
            <Column
              key={c.key}
              column={c}
              index={ci}
              height={height}
              from={from}
              to={to}
              lines={lines}
              nowY={nowVisible && c.isToday ? nowY : null}
              loading={loading}
              selectedId={selectedId}
              initialsFor={initialsFor}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
      {overlay}
    </div>
  );
}

function Column({
  column: c,
  index,
  height,
  from,
  to,
  lines,
  nowY,
  loading,
  selectedId,
  initialsFor,
  onOpen,
}: {
  column: GridColumn;
  index: number;
  height: number;
  from: number;
  to: number;
  lines: React.CSSProperties;
  nowY: number | null;
  loading: boolean;
  selectedId: string | null;
  initialsFor?: (a: Placed) => string | null;
  onOpen: (a: Placed, el: HTMLElement) => void;
}) {
  const slots = React.useMemo(
    () => packOverlaps(c.items.map((a) => ({ id: a.id, start: a.startMin, end: a.endMin }))),
    [c.items]
  );
  const yOf = (min: number) => (min - from) * PPM;

  // Sütun genişliği: yan yana sıkışan blok darsa yalnızca ilk ad gösterilir
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={c.label}
      className="relative min-w-0 border-l border-separator"
      style={{ height, ...lines }}
    >
      {c.off.map(([s, e]) => (
        <div
          key={`off-${s}-${e}`}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bg-[color:var(--hover)]"
          style={{ top: yOf(s), height: (e - s) * PPM }}
        />
      ))}
      {c.notes?.map((n) => (
        <span
          key={`note-${n.at}-${n.text}`}
          className="pointer-events-none absolute left-2 text-[0.6875rem] font-semibold text-label-2"
          style={{ top: yOf(n.at) + 4 }}
        >
          {n.text}
        </span>
      ))}

      {loading
        ? SKELETON[index % SKELETON.length].map(([s, d]) => {
            const start = from + s;
            if (start + d > to) return null;
            return (
              <div
                key={s}
                aria-hidden
                className="skeleton absolute inset-x-1 rounded-[9px]"
                style={{ top: yOf(start) + 1, height: d * PPM - 2 }}
              />
            );
          })
        : c.items.map((a) => {
            const slot = slots.get(a.id) ?? { col: 0, cols: 1, span: 1 };
            const top = yOf(Math.max(a.startMin, from)) + 1;
            const h = Math.max(18, (Math.min(a.endMin, to) - Math.max(a.startMin, from)) * PPM - 2);
            const density = h < 28 ? "tiny" : h < 44 ? "compact" : "regular";
            // Ölçülmeden önce (sunucu çıktısı) tam metin; ölçünce darlığa göre kısalır
            const px = width ? (width * slot.span) / slot.cols - 4 : Infinity;
            const narrow = px < 84;
            const sliver = px < 34;
            return (
              <AppointmentBlock
                key={a.id}
                status={a.status}
                title={sliver ? "" : narrow ? a.customer_name.split(/\s+/)[0] : a.customer_name}
                detail={
                  narrow
                    ? undefined
                    : density === "compact"
                      ? timeSpan(a).split("–")[0]
                      : [timeSpan(a), a.service_name].filter(Boolean).join(" · ")
                }
                aside={narrow ? undefined : (initialsFor?.(a) ?? undefined)}
                density={density}
                selected={selectedId === a.id}
                aria-label={blockLabel(a)}
                aria-haspopup="dialog"
                aria-expanded={selectedId === a.id}
                hint={blockLabel(a)}
                data-appt={a.id}
                onClick={(e) => onOpen(a, e.currentTarget)}
                className="absolute z-[1] focus-visible:z-[3]"
                style={{
                  top,
                  height: h,
                  left: `calc(${(slot.col / slot.cols) * 100}% + 2px)`,
                  width: `calc(${(slot.span / slot.cols) * 100}% - 4px)`,
                }}
              />
            );
          })}

      {nowY !== null && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-[2]" style={{ top: nowY }}>
          <div className="h-[2px] -translate-y-1/2 bg-danger" />
        </div>
      )}
    </div>
  );
}

/** Yükleniyor iskeleti: sütun başına birkaç sabit blok (dakika, süre). */
const SKELETON: [number, number][][] = [
  [[60, 60], [210, 45], [360, 90]],
  [[30, 45], [150, 60], [300, 60]],
  [[90, 90], [270, 45], [420, 60]],
  [[0, 60], [180, 60], [330, 45]],
];
