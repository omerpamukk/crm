"use client"

import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { useMotionPreset } from "@/lib/motion"
import { formatMoney } from "./money"

/* --------------------------------------------------------------------------
   TrendChart — E+F grafik dili (Genel Bakış'taki Ciro sparkline'ının büyüğü).

   kind="line"  Indigo 2px çizgi, altta solan dolgu, son noktada halkalı nokta.
                Dönemi süren son nokta (`partial`) kesik çizgiyle ve içi boş
                noktayla biter.
   kind="bar"   ≤24px Indigo sütun, üstü 4px yuvarlak, taban düz. Süren dönem
                soluk sütun.

   - Tek seri; isteğe bağlı gri karşılaştırma çizgisi (`compare`, yalnız line).
     İki seri olunca üstte açıklama satırı çıkar.
   - Sıfır tabanlı tek eksen; sağda 3–4 yuvarlak değer ("₺10 bin"), kılcal
     ızgara. Etiketler tek satır; sığmazsa seyrekleşir (son etiket hep görünür).
   - Üzerine gelince/dokununca en yakın nokta seçilir: dikey kılavuz çizgi
     (line) ya da diğer sütunlar soluklaşır (bar) ve değeri gösteren kutu.
     Klavye: odaklanınca ← → Home End; ekran okuyucu için gizli tablo.
   - Renkler yalnızca tokenlardan; açık/koyu tema kendiliğinden.
   - Veri yoksa (line < 2 nokta, bar 0 nokta) hiçbir şey çizmez — boş
     durumu çağıran `EmptyState` ile gösterir.
   -------------------------------------------------------------------------- */

export type TrendPoint = {
  /** Eksendeki kısa ad, tek satır ("Kas", "12 Kas"). */
  label: string
  value: number
  /** Kutudaki tam ad ("Kasım 2026"). Yoksa `label`. */
  hint?: string
  /** Dönem sürüyor (bu ay): soluk sütun / kesik son çizgi. */
  partial?: boolean
}

export type TrendUnit = "money" | "number" | "percent"

export type TrendChartProps = {
  data: readonly TrendPoint[]
  kind?: "line" | "bar"
  /** Değer biçimi: money ₺41.850 · number 1.284 · percent %42. */
  unit?: TrendUnit
  /** Grafiğin adı (ekran okuyucu ve gizli tablo başlığı): "Son 6 ay satış". */
  label: string
  /** Serinin adı (kutuda ve açıklamada): "Satış". */
  seriesName?: string
  /** Gri karşılaştırma serisi (yalnız line): aynı uzunlukta değerler. */
  compare?: { name: string; values: readonly number[] }
  /** Eksen etiketleri dahil yükseklik (px). */
  height?: number
  /** Sağdaki değer ekseni ve ızgara. */
  showAxis?: boolean
  className?: string
}

const BAR_MAX = 24
const PAD_TOP = 10
const AXIS_H = 26
const EDGE = 8 // nokta yarıçapı + halka
const CHAR_W = 6.6 // 12px sistem yazısı, tabular rakam (yaklaşık)

const TRY_PLAIN = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 })
const INT = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 })

function formatValue(v: number, unit: TrendUnit): string {
  if (unit === "money") return formatMoney(v)
  if (unit === "percent") return `%${INT.format(v)}`
  return INT.format(v)
}

/** Eksen için kısa biçim: ₺500 · ₺12,5 bin · ₺1,2 mn (sade Türkçe). */
function formatTick(v: number, unit: TrendUnit): string {
  if (unit === "percent") return `%${INT.format(v)}`
  const abs = Math.abs(v)
  const body =
    abs >= 1_000_000
      ? `${TRY_PLAIN.format(v / 1_000_000)} mn`
      : abs >= 10_000
        ? `${TRY_PLAIN.format(v / 1_000)} bin`
        : INT.format(v)
  return unit === "money" ? `₺${body}` : body
}

/** 0'dan başlayan yuvarlak eksen adımları (1 · 2 · 2,5 · 5 × 10ⁿ). */
function niceTicks(max: number, target = 3): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  const ticks: number[] = []
  for (let t = 0; t < max + step * 0.999; t += step) ticks.push(Math.round(t * 100) / 100)
  return ticks
}

/** Üstü yuvarlak, tabanı düz sütun yolu. */
function barPath(x: number, w: number, y: number, base: number): string {
  const h = Math.max(0, base - y)
  const r = Math.min(4, w / 2, h)
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`
}

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [w, setW] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function TrendChart({
  data,
  kind = "line",
  unit = "number",
  label,
  seriesName,
  compare,
  height = 200,
  showAxis = true,
  className,
}: TrendChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const tipRef = React.useRef<HTMLDivElement>(null)
  const { transition, reduce } = useMotionPreset()
  const gradId = `trend-${React.useId().replace(/:/g, "")}`
  const [active, setActive] = React.useState<number | null>(null)
  const [touchHeld, setTouchHeld] = React.useState(false)

  const n = data.length
  const cmp = kind === "line" && compare && compare.values.length === n ? compare.values : null
  const drawable = kind === "line" ? n >= 2 : n >= 1

  // ---- Ölçek ----
  const maxV = Math.max(0, ...data.map((d) => d.value), ...(cmp ?? []))
  const ticks = niceTicks(maxV)
  const top = ticks[ticks.length - 1] || 1
  const tickLabels = ticks.map((t) => formatTick(t, unit))
  const gutter = showAxis ? Math.ceil(Math.max(...tickLabels.map((l) => l.length)) * CHAR_W) + 10 : 0
  const plotL = kind === "line" ? EDGE : 0
  const plotR = Math.max(plotL + 1, width - gutter - (kind === "line" ? EDGE : 0))
  const plotW = plotR - plotL
  const base = height - AXIS_H
  const yOf = (v: number) => base - (Math.max(0, v) / top) * (base - PAD_TOP)
  const band = kind === "bar" ? plotW / Math.max(1, n) : 0
  const barW = Math.max(4, Math.min(BAR_MAX, band * 0.56))
  const xOf = (i: number) =>
    kind === "bar" ? plotL + band * (i + 0.5) : plotL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)

  // ---- Eksen etiketleri: sığmayanlar seyrekleşir, son etiket hep görünür ----
  const labelW = Math.max(...data.map((d) => d.label.length), 1) * CHAR_W + 10
  const spacing = n > 1 ? (kind === "bar" ? band : plotW / (n - 1)) : plotW
  const every = Math.max(1, Math.ceil(labelW / Math.max(1, spacing)))
  const showLabel = (i: number) => (n - 1 - i) % every === 0

  // ---- Yollar ----
  const pts = data.map((d, i) => [xOf(i), yOf(d.value)] as const)
  const lastPartial = kind === "line" && n >= 2 && data[n - 1].partial
  const solidPts = lastPartial ? pts.slice(0, -1) : pts
  const linePath = solidPts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const tailPath = lastPartial
    ? `M${pts[n - 2][0].toFixed(1)},${pts[n - 2][1].toFixed(1)} L${pts[n - 1][0].toFixed(1)},${pts[n - 1][1].toFixed(1)}`
    : ""
  const areaPath =
    n >= 2
      ? `M${pts[0][0].toFixed(1)},${base} ` +
        pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") +
        ` L${pts[n - 1][0].toFixed(1)},${base} Z`
      : ""
  const cmpPath = cmp
    ? cmp.map((v, i) => `${i ? "L" : "M"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ")
    : ""

  // ---- Etkileşim ----
  function indexAt(clientX: number): number {
    const el = wrapRef.current
    if (!el || n === 0) return 0
    const x = clientX - el.getBoundingClientRect().left
    if (kind === "bar") return Math.max(0, Math.min(n - 1, Math.floor((x - plotL) / band)))
    return Math.max(0, Math.min(n - 1, Math.round(((x - plotL) / plotW) * (n - 1))))
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch" && !touchHeld) return
    setActive(indexAt(e.clientX))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") setTouchHeld(true)
    setActive(indexAt(e.clientX))
  }

  // Dokunmada kutu parmak kalkınca da kalır; dışarı dokununca kapanır
  React.useEffect(() => {
    if (active === null) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setActive(null)
        setTouchHeld(false)
      }
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [active, wrapRef])

  function onKeyDown(e: React.KeyboardEvent) {
    if (n === 0) return
    const cur = active ?? n - 1
    let next: number | null = null
    if (e.key === "ArrowRight") next = Math.min(n - 1, cur + 1)
    else if (e.key === "ArrowLeft") next = Math.max(0, cur - 1)
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = n - 1
    else if (e.key === "Escape") {
      setActive(null)
      return
    }
    if (next !== null) {
      e.preventDefault()
      setActive(next)
    }
  }

  // Kutu: noktanın üstünde, sığmazsa altında; kenarlarda içeri kayar
  React.useLayoutEffect(() => {
    const tip = tipRef.current
    if (!tip || active === null || !width) return
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const ax = xOf(active)
    const ay = kind === "bar" ? yOf(data[active].value) : Math.min(yOf(data[active].value), cmp ? yOf(cmp[active]) : Infinity)
    const left = Math.max(0, Math.min(width - tw, ax - tw / 2))
    const above = ay - th - 10
    const topPx = above >= 0 ? above : Math.min(base - th, ay + 14)
    tip.style.transform = `translate(${left}px, ${topPx}px)`
    tip.style.visibility = "visible"
  })

  const activePoint = active !== null ? data[active] : null
  const announce = activePoint
    ? `${activePoint.hint ?? activePoint.label}: ${formatValue(activePoint.value, unit)}${activePoint.partial ? ", dönem sürüyor" : ""}`
    : ""

  const enter = transition("default")

  return (
    <div className={cn("min-w-0", className)}>
      {cmp && (
        <div className="mb-2 flex min-w-0 items-center gap-4 text-footnote whitespace-nowrap text-label-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{seriesName ?? "Bu dönem"}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full bg-label-3" />
            <span className="truncate">{compare!.name}</span>
          </span>
        </div>
      )}

      <div
        ref={wrapRef}
        role="group"
        aria-roledescription="grafik"
        aria-label={`${label}. Değerler için sol ve sağ ok tuşları.`}
        tabIndex={drawable ? 0 : -1}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((a) => a ?? (n ? n - 1 : null))}
        onBlur={() => {
          setActive(null)
          setTouchHeld(false)
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setActive(null)
        }}
        className="focus-ring relative w-full touch-pan-y rounded-[10px] select-none"
        style={{ height }}
      >
        {width > 0 && drawable && (
          <svg width={width} height={height} aria-hidden className="block overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="1" stopColor="var(--primary)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            {/* Izgara + değer ekseni */}
            {showAxis &&
              ticks.map((t, i) => (
                <g key={t}>
                  <line
                    x1={0}
                    x2={width - gutter + 4}
                    y1={yOf(t) + 0.5}
                    y2={yOf(t) + 0.5}
                    stroke={i === 0 ? "var(--sep-strong)" : "var(--sep)"}
                    strokeWidth={1}
                  />
                  <text
                    x={width}
                    y={yOf(t) + 4}
                    textAnchor="end"
                    className="fill-label-2 text-[0.75rem] tabular-nums"
                  >
                    {tickLabels[i]}
                  </text>
                </g>
              ))}
            {!showAxis && (
              <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} stroke="var(--sep-strong)" strokeWidth={1} />
            )}

            {/* Zaman ekseni */}
            {data.map((d, i) => {
              if (!showLabel(i)) return null
              const x = xOf(i)
              const half = (d.label.length * CHAR_W) / 2
              // Kenara taşacak etiket içeri yaslanır (kesilmez)
              const anchor = x - half < 0 ? "start" : x + half > width ? "end" : "middle"
              return (
                <text
                  key={i}
                  x={anchor === "start" ? 0 : anchor === "end" ? width : x}
                  y={height - 7}
                  textAnchor={anchor}
                  className={cn(
                    "text-[0.75rem] tabular-nums",
                    active === i ? "fill-label font-semibold" : "fill-label-2"
                  )}
                >
                  {d.label}
                </text>
              )
            })}

            {kind === "bar" ? (
              data.map((d, i) => {
                const x = xOf(i) - barW / 2
                const dim = active !== null && active !== i
                return (
                  <motion.path
                    key={i}
                    d={barPath(x, barW, yOf(d.value), base)}
                    initial={reduce ? { opacity: 0, d: barPath(x, barW, yOf(d.value), base) } : { d: barPath(x, barW, base, base) }}
                    animate={{ d: barPath(x, barW, yOf(d.value), base), opacity: 1 }}
                    transition={reduce ? enter : { ...enter, delay: Math.min(i * 0.025, 0.3) }}
                    fill="var(--primary)"
                    fillOpacity={(d.partial ? 0.4 : 1) * (dim ? 0.45 : 1)}
                    style={{ transition: "fill-opacity 150ms ease-out" }}
                  />
                )
              })
            ) : (
              <>
                <motion.path
                  d={areaPath}
                  fill={`url(#${gradId})`}
                  initial={{ opacity: 0, d: areaPath }}
                  animate={{ opacity: 1, d: areaPath }}
                  transition={enter}
                />
                {cmp && (
                  <motion.path
                    d={cmpPath}
                    initial={{ opacity: 0, d: cmpPath }}
                    animate={{ opacity: 1, d: cmpPath }}
                    transition={enter}
                    fill="none"
                    stroke="var(--label-3)"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                <motion.path
                  d={linePath}
                  initial={reduce ? { opacity: 0, d: linePath } : { pathLength: 0, d: linePath }}
                  animate={{ pathLength: 1, opacity: 1, d: linePath }}
                  transition={enter}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {lastPartial && (
                  <motion.path
                    d={tailPath}
                    initial={{ opacity: 0, d: tailPath }}
                    animate={{ opacity: 1, d: tailPath }}
                    transition={enter}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                  />
                )}
                {/* Kılavuz çizgi */}
                {active !== null && (
                  <line
                    x1={xOf(active)}
                    x2={xOf(active)}
                    y1={PAD_TOP - 4}
                    y2={base}
                    stroke="var(--sep-strong)"
                    strokeWidth={1}
                  />
                )}
                {cmp && active !== null && (
                  <circle cx={xOf(active)} cy={yOf(cmp[active])} r={3.5} fill="var(--label-3)" stroke="var(--surface)" strokeWidth={2} />
                )}
                {/* Son nokta (ya da seçili nokta) */}
                {(() => {
                  const i = active ?? n - 1
                  const hollow = active === null && data[i].partial
                  return (
                    <motion.circle
                      cx={pts[i][0]}
                      cy={pts[i][1]}
                      initial={false}
                      animate={{ cx: pts[i][0], cy: pts[i][1] }}
                      transition={active === null ? enter : { duration: 0 }}
                      r={4.5}
                      fill={hollow ? "var(--surface)" : "var(--primary)"}
                      stroke={hollow ? "var(--primary)" : "var(--surface)"}
                      strokeWidth={2}
                    />
                  )
                })()}
              </>
            )}
          </svg>
        )}

        {/* Değer kutusu */}
        {activePoint && width > 0 && (
          <div
            ref={tipRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 z-10 rounded-[10px] bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-pop ring-1 ring-[color:var(--sep)]"
            style={{ visibility: "hidden" }}
          >
            <span className="block text-[0.9375rem] leading-5 font-semibold text-label tabular-nums">
              {formatValue(activePoint.value, unit)}
            </span>
            {cmp && active !== null && (
              <span className="flex items-center gap-1.5 text-footnote text-label-2 tabular-nums">
                <span aria-hidden className="h-0.5 w-2.5 rounded-full bg-label-3" />
                {compare!.name} {formatValue(cmp[active], unit)}
              </span>
            )}
            <span className="block text-footnote text-label-2">
              {[seriesName, activePoint.hint ?? activePoint.label].filter(Boolean).join(" · ")}
              {activePoint.partial ? " · sürüyor" : ""}
            </span>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </div>

      {/* Ekran okuyucu için veri tablosu */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Dönem</th>
            <th scope="col">{seriesName ?? "Değer"}</th>
            {cmp && <th scope="col">{compare!.name}</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.hint ?? d.label}</th>
              <td>
                {formatValue(d.value, unit)}
                {d.partial ? " (sürüyor)" : ""}
              </td>
              {cmp && <td>{formatValue(cmp[i], unit)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
