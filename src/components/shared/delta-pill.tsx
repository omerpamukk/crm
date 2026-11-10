import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Yüzde değişim hapı: artış yeşil, azalış kırmızı (F). Ok + yüzde; ekran
 * okuyucuya "artış/azalış" söylenir. `invert` — azalmanın iyi olduğu
 * metrikler için (ör. gelmeyen randevu): renkler yer değiştirir.
 */
export function DeltaPill({
  value,
  invert = false,
  className,
}: {
  /** Yüzde değişim (ör. 12 → "%12", -5 → "%5" aşağı). */
  value: number
  invert?: boolean
  className?: string
}) {
  const up = value >= 0
  const good = invert ? !up : up
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full pr-[7px] pl-[5px] text-[0.75rem] leading-5 font-semibold whitespace-nowrap tabular-nums",
        good ? "bg-positive-soft text-positive-text" : "bg-danger-soft text-danger-text",
        className
      )}
    >
      <Icon aria-hidden className="size-3" strokeWidth={2.6} />%
      {Math.abs(value).toLocaleString("tr-TR")}
      <span className="sr-only">{up ? " artış" : " azalış"}</span>
    </span>
  )
}
