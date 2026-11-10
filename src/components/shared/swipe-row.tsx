"use client"

import * as React from "react"
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type PanInfo,
} from "motion/react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { haptic, nearest, project, useMotionPreset } from "@/lib/motion"

export type SwipeAction = {
  label: string
  icon?: LucideIcon
  tone?: "positive" | "primary" | "neutral" | "danger"
  onAction: () => void
}

const TONE: Record<NonNullable<SwipeAction["tone"]>, string> = {
  positive: "bg-positive text-positive-foreground",
  primary: "bg-primary-fill text-on-primary-fill",
  neutral: "bg-label-2 text-surface",
  danger: "bg-danger text-danger-foreground",
}

const ACTION_W = 84

// Aynı anda yalnızca bir satır açık kalır
let openRowClose: (() => void) | null = null

/**
 * Kaydırarak işlem (telefon, HIG › Swipe actions + F'nin hareketi).
 *
 * - Sağa kaydırma (`leading`): yarıyı geçince "kurulur" (titreşim), bırakınca
 *   eylem çalışır — ör. Geldi. Tam kaydırma tek eylemdir.
 * - Sola kaydırma (`trailing`): arkadaki düğmeler açılır — ör. Ara, Ödeme al.
 * - 1:1 takip, uçlarda lastik bant, bırakınca hız yansıtılır.
 * - Yalnızca dokunmatik/kalemle başlar; fareyle tıklama bozulmaz.
 *
 * KURAL: Kaydırma tek yol olamaz. Aynı eylemin her zaman görünür bir
 * karşılığı olmalı (satırdaki düğme, ayrıntı sayfası). Bu yüzden kaydırma
 * düğmeleri ekran okuyucudan ve sekme sırasından gizlidir.
 */
export function SwipeRow({
  leading,
  trailing = [],
  disabled = false,
  className,
  children,
}: {
  leading?: SwipeAction
  trailing?: SwipeAction[]
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  const { transition } = useMotionPreset()
  const ref = React.useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const controls = useDragControls()
  const [armed, setArmed] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const trailW = trailing.length * ACTION_W
  const leadWidth = useTransform(x, (v) => Math.max(0, v))
  const width = () => ref.current?.offsetWidth ?? 360

  const close = React.useCallback(() => {
    animate(x, 0, transition("default"))
    setOpen(false)
  }, [transition, x])

  useMotionValueEvent(x, "change", (v) => {
    if (!leading) return
    const a = v > width() * 0.5
    if (a !== armed) {
      setArmed(a)
      haptic(8)
    }
  })

  function onDragStart() {
    if (openRowClose && openRowClose !== close) openRowClose()
    openRowClose = close
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const v = info.velocity.x
    if (leading && armed) {
      animate(x, width(), {
        ...transition("snappy", v),
        onComplete: () => {
          leading.onAction()
          setArmed(false)
          animate(x, 0, transition("default"))
        },
      })
      return
    }
    const snaps = [0, ...(trailW ? [-trailW] : [])]
    const target = nearest(snaps, x.get() + project(v, 0.99))
    animate(x, target, transition(Math.abs(v) > 400 ? "momentum" : "default", v))
    setOpen(target !== 0)
  }

  if (disabled || (!leading && trailing.length === 0)) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref} className={cn("relative touch-pan-y overflow-hidden", className)}>
      {leading && (
        <motion.div
          aria-hidden
          className={cn("absolute inset-y-0 left-0 overflow-hidden", TONE[leading.tone ?? "positive"])}
          style={{ width: leadWidth }}
        >
          <span
            className={cn(
              "flex h-full min-w-24 flex-col items-start justify-center gap-[3px] pl-6 text-[0.75rem] font-semibold whitespace-nowrap transition-[filter] duration-150",
              armed && "brightness-110"
            )}
          >
            {leading.icon && <leading.icon className="size-5" />}
            {leading.label}
          </span>
        </motion.div>
      )}
      {trailing.length > 0 && (
        <div aria-hidden className="absolute inset-y-0 right-0 flex">
          {trailing.map((a) => (
            <button
              key={a.label}
              type="button"
              tabIndex={-1}
              onClick={() => {
                close()
                a.onAction()
              }}
              className={cn(
                "grid place-items-center content-center gap-[3px] text-[0.75rem] font-semibold whitespace-nowrap",
                TONE[a.tone ?? "primary"]
              )}
              style={{ width: ACTION_W }}
            >
              {a.icon && <a.icon className="size-5" />}
              {a.label}
            </button>
          ))}
        </div>
      )}
      <motion.div
        className="relative z-[1] bg-surface"
        style={{ x }}
        drag="x"
        dragControls={controls}
        dragListener={false}
        dragDirectionLock
        dragMomentum={false}
        dragConstraints={{ left: -trailW, right: leading ? 4000 : 0 }}
        dragElastic={{ left: trailW ? 0.12 : 0.06, right: leading ? 0 : 0.06 }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return
          controls.start(e)
        }}
        onClickCapture={(e) => {
          if (open) {
            e.preventDefault()
            e.stopPropagation()
            close()
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
