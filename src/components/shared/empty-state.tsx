import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Boş durum (HIG › ContentUnavailable). Çıkmaz yok: ne olduğunu söyler,
 * ne yapılacağını söyler ve düğmesini sunar.
 * - `variant="card"` (varsayılan) kendi opak grubunu çizer.
 * - `variant="inline"` bir grubun/tablonun içinde kullanılır (zeminsiz).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  variant?: "card" | "inline"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        variant === "card" && "surface",
        className
      )}
    >
      <Icon aria-hidden className="size-10 text-label-3" strokeWidth={1.5} />
      <h3 className="mt-3 text-headline text-balance">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[21.25rem] text-[0.875rem] text-label-2">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
