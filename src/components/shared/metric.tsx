import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { DeltaPill } from "./delta-pill"
import { Sparkline } from "./sparkline"
import { StatusBadge } from "./status"

export type MetricProps = {
  /** Kısa etiket — tek satır ("Ciro", "Açık borç"). */
  label: string
  /** Biçimlenmiş değer ("₺41.850", "64"). */
  value: React.ReactNode
  /** Verilirse etiketin yanında › çıkar ve kutu bağlantı olur. */
  href?: string
  /** Yüzde değişim → DeltaPill. */
  delta?: number | null
  /** Azalmanın iyi olduğu metrik (renkleri çevirir). */
  invertDelta?: boolean
  /** Kırmızı uyarı satırı ("3 gecikmiş"); delta yerine gösterilir. */
  flag?: string
  /** Bağlam metni ("geçen ay aynı döneme göre"). Sığmazsa kısalır. */
  context?: string
  /** Değerin tonu: borç gibi olumsuz tutarlar için "danger". */
  tone?: "default" | "danger"
  /** Küçük çizgi grafik verisi (yalnızca bir metrikte, ör. Ciro). */
  sparkline?: readonly number[]
  sparklineTitle?: string
  className?: string
}

/**
 * Tek gösterge: etiket ›, büyük değer, DeltaPill ya da uyarı, bağlam.
 * Her satır tek satırdır; dar ekranda bağlam metni kısalır (title'da tamamı).
 * Tek başına değil `MetricStrip` içinde kullanılır.
 */
export function Metric({
  label,
  value,
  href,
  delta,
  invertDelta,
  flag,
  context,
  tone = "default",
  sparkline,
  sparklineTitle,
  className,
}: MetricProps) {
  const body = (
    <>
      <span
        className={cn(
          "flex min-w-0 items-center gap-0.5 text-subhead font-semibold whitespace-nowrap text-label-2",
          sparkline && "pr-16 md:pr-24"
        )}
      >
        <span className="truncate">{label}</span>
        {href && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-label-3" />}
      </span>
      <span className={cn("metric-value", tone === "danger" && "text-danger-text")}>{value}</span>
      {(delta != null || flag || context) && (
        <span className="flex min-w-0 items-center gap-1.5 text-subhead whitespace-nowrap text-label-2">
          {flag ? (
            <StatusBadge variant="danger">{flag}</StatusBadge>
          ) : delta != null ? (
            <DeltaPill value={delta} invert={invertDelta} />
          ) : null}
          {context && (
            <span className={cn("min-w-0 truncate", (flag || delta != null) && "max-md:hidden")} title={context}>
              {flag ? `· ${context}` : context}
            </span>
          )}
        </span>
      )}
      {sparkline && (
        <span className="pointer-events-none absolute top-3 right-3 md:right-[18px]">
          <Sparkline data={sparkline} title={sparklineTitle} className="h-5 w-14 md:h-7 md:w-[88px]" />
        </span>
      )}
    </>
  )
  const cls = cn(
    "metric-cell relative flex min-w-0 flex-col gap-0.5 px-3.5 py-3 md:px-5 md:py-4",
    className
  )
  if (href) {
    return (
      <Link
        href={href}
        className={cn(cls, "transition-colors duration-150 hover:bg-hover focus-visible:outline-offset-[-3px]")}
      >
        {body}
      </Link>
    )
  }
  return <div className={cls}>{body}</div>
}

/**
 * KPI şeridi — tek opak grup içinde 2–4 gösterge, aralarında ince ayırıcı.
 * 4 gösterge: telefonda ve orta genişlikte 2×2, ≥1024px'te tek sıra.
 * 3 gösterge: telefonda alt alta, ≥640px'te tek sıra. 2 gösterge: yan yana.
 */
export function MetricStrip({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode
  className?: string
  "aria-label"?: string
}) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : 1
  return (
    <section
      aria-label={ariaLabel}
      data-count={count}
      className={cn("metric-strip surface grid overflow-clip", className)}
    >
      {children}
    </section>
  )
}
