import { CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
})
const TRY_CENTS = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })

/** ₺ biçimi; küsurat yoksa kuruş gösterilmez (₺41.850). */
export function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? TRY.format(amount) : TRY_CENTS.format(amount)
}

/**
 * Para tutarı — hizalı rakam, tek satır. Borç kırmızı (F).
 *  - `tone="debt"`   kırmızı tutar
 *  - `overdue`       kırmızı + uyarı simgesi + (varsa) `suffix` ("gecikmiş borç")
 *  - `suffix`        tutarın yanındaki kısa metin ("açık borç")
 */
export function Money({
  amount,
  tone = "default",
  overdue = false,
  suffix,
  className,
}: {
  amount: number
  tone?: "default" | "debt" | "muted"
  overdue?: boolean
  suffix?: string
  className?: string
}) {
  const debt = tone === "debt" || overdue
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 whitespace-nowrap tabular-nums",
        debt && "font-semibold text-danger-text",
        tone === "muted" && "text-label-2",
        className
      )}
    >
      {overdue && <CircleAlert aria-hidden className="size-[15px] shrink-0" />}
      <span className="shrink-0">{formatMoney(amount)}</span>
      {suffix && <span className="min-w-0 truncate font-medium">{suffix}</span>}
    </span>
  )
}
