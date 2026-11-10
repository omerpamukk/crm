"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, UserCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { haptic, spring } from "@/lib/motion"

/**
 * Geldi düğmesi (F'nin "Geldi anı").
 *
 * - Basınca yeşil dolgu basılan noktadan yayılır, onay işareti yayla belirir.
 * - Geldi durumundayken basmak geri alır (dolgu aynı noktaya çekilir).
 * - İşlevi dışarıdan alır: `onArrive` / `onUndo`. Promise dönerse ve
 *   reddedilirse düğme eski haline döner (iyimser güncelleme).
 * - Ekran okuyucu: aria-pressed + müşteri adıyla açık ad.
 *
 * Bildirim ve "Geri al" sayfanın işidir:
 *   onArrive={() => { markArrived(id); toastUndo(`${ad} geldi`, () => undo(id)) }}
 */
export function GeldiButton({
  arrived,
  onArrive,
  onUndo,
  customerName,
  size = "md",
  className,
}: {
  arrived: boolean
  onArrive: () => void | Promise<unknown>
  onUndo?: () => void | Promise<unknown>
  /** Ekran okuyucu adı için ("Zeynep Arslan: Geldi olarak işaretle"). */
  customerName?: string
  /** sm 28px (satır içi) · md 34px · lg 44px (telefonda tam genişlik) */
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const [optimistic, setOptimistic] = React.useState(arrived)
  const [origin, setOrigin] = React.useState({ x: "50%", y: "50%" })
  const [pending, setPending] = React.useState(false)

  // Dışarıdan gelen gerçek durumla eşitle (render sırasında, efektsiz)
  const [prevArrived, setPrevArrived] = React.useState(arrived)
  if (arrived !== prevArrived) {
    setPrevArrived(arrived)
    setOptimistic(arrived)
  }

  async function run(next: boolean) {
    const fn = next ? onArrive : onUndo
    // Sunucu yanıtı gelmeden ikinci basış yok sayılır (Geldi ve Geri al yarışmasın)
    if (!fn || pending) return
    setOptimistic(next)
    if (next) haptic(12)
    try {
      setPending(true)
      await fn()
    } catch {
      setOptimistic(!next)
    } finally {
      setPending(false)
    }
  }

  const label = customerName
    ? optimistic
      ? `${customerName} geldi. Geri almak için basın`
      : `${customerName}: Geldi olarak işaretle`
    : optimistic
      ? "Geldi. Geri almak için basın"
      : "Geldi olarak işaretle"

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={label}
      aria-busy={pending || undefined}
      data-arrived={optimistic}
      disabled={optimistic && !onUndo}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setOrigin({ x: `${e.clientX - r.left}px`, y: `${e.clientY - r.top}px` })
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setOrigin({ x: "50%", y: "50%" })
      }}
      onClick={() => run(!optimistic)}
      style={{ "--px": origin.x, "--py": origin.y } as React.CSSProperties}
      className={cn(
        "pressable relative isolate inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full font-semibold whitespace-nowrap transition-colors duration-200 disabled:cursor-default",
        size === "sm" && "h-7 px-3 text-[0.8125rem]",
        size === "md" && "h-[34px] px-4 text-[0.875rem]",
        size === "lg" && "h-11 px-5 text-[0.9375rem]",
        optimistic
          ? "text-positive-foreground"
          : "bg-positive-soft text-positive-text hover:bg-[color:var(--positive-soft-2)]",
        className
      )}
    >
      <span aria-hidden className="geldi-fill absolute inset-0 -z-10 bg-positive" />
      <span className="relative grid size-4 place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {optimistic ? (
            <motion.span
              key="check"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={spring.momentum}
              className="grid place-items-center"
            >
              <Check className="size-4" strokeWidth={2.6} />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={spring.snappy}
              className="grid place-items-center"
            >
              <UserCheck className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      Geldi
    </button>
  )
}
