import Link from "next/link"
import { ChevronRight, Info, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { DeltaPill } from "./delta-pill"

export type StatCardProps = {
  label: string
  value: string
  /** Eski API — yeni dilde KPI'da ikon kutucuğu yok; kabul edilir, çizilmez. */
  icon?: LucideIcon
  /** Değerin altındaki karşılaştırma metni, ör. "geçen aya göre". */
  comparison?: string
  /** Yüzde değişim → DeltaPill. */
  delta?: number | null
  /** Ek açıklama satırı. */
  sub?: string | null
  /** ⓘ ipucu metni. */
  hint?: string
  /** Değere uygulanacak renk sınıfı (ör. borç için text-danger). */
  accent?: string
  href?: string
  children?: React.ReactNode
}

/**
 * Tek başına KPI kartı (eski sayfalar için). Yeni ekranlarda tek grup içinde
 * ayırıcılı şerit veren `MetricStrip` + `Metric` tercih edilir.
 */
export function StatCard({
  label,
  value,
  comparison,
  delta,
  sub,
  hint,
  accent,
  href,
  children,
}: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined

  const body = (
    <>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate text-subhead font-semibold text-label-2">{label}</span>
        {href && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-label-3" />}
        {hint && (
          <Info className="ml-auto size-3.5 shrink-0 text-label-3" aria-label={hint} role="img" />
        )}
      </div>
      <p className={cn("metric-value mt-1", accent)}>{value}</p>
      {(hasDelta || comparison || sub) && (
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-subhead whitespace-nowrap text-label-2">
          {hasDelta && <DeltaPill value={delta!} />}
          {comparison && <span className="min-w-0 truncate" title={comparison}>{comparison}</span>}
          {sub && <span className="min-w-0 truncate" title={sub}>{sub}</span>}
        </div>
      )}
      {children}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="surface hover-tint block min-w-0 p-4 md:px-5"
      >
        {body}
      </Link>
    )
  }

  return <div className="surface min-w-0 p-4 md:px-5">{body}</div>
}
