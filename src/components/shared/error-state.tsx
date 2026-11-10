"use client"

import { RotateCw, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Hata durumu — ne olduğunu ve ne yapılacağını söyler; ham hata kodu
 * göstermez. `onRetry` verilirse "Tekrar dene" düğmesi çıkar.
 * Sayfa düzeyinde `error.tsx` içinde, bölüm düzeyinde veri gelmeyince kullanılır.
 */
export function ErrorState({
  title = "Bu bölüm yüklenemedi",
  description = "Bağlantıda bir sorun olabilir. Biraz sonra tekrar deneyin; sorun sürerse sayfayı yenileyin.",
  onRetry,
  action,
  variant = "card",
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  /** onRetry yerine özel düğme. */
  action?: React.ReactNode
  variant?: "card" | "inline"
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        variant === "card" && "surface",
        className
      )}
    >
      <TriangleAlert aria-hidden className="size-10 text-warning-text" strokeWidth={1.5} />
      <h3 className="mt-3 text-headline text-balance">{title}</h3>
      <p className="mt-1 max-w-[22.5rem] text-[0.875rem] text-label-2">{description}</p>
      {(onRetry || action) && (
        <div className="mt-4">
          {action ?? (
            <Button variant="secondary" onClick={onRetry}>
              <RotateCw />
              Tekrar dene
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
