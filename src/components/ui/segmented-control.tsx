"use client"

import * as React from "react"
import { animate, useMotionValue, motion } from "motion/react"

import { cn } from "@/lib/utils"
import { nearest, project, rubberband, useMotionPreset } from "@/lib/motion"

export type SegmentedItem<T extends string = string> = {
  value: T
  label: React.ReactNode
  /** Etiketin yanında soluk sayı (ör. "Aktif 1.142"). */
  count?: number
  disabled?: boolean
}

export type SegmentedControlProps<T extends string = string> = {
  items: readonly SegmentedItem<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Ekran okuyucu için grup adı (zorunlu). */
  "aria-label": string
  /** sm 26px · md 28px (varsayılan) · lg 32px (telefon) ·
   *  touch: telefonda 44px dokunma hedefi, md ve üstünde 28px */
  size?: "sm" | "md" | "lg" | "touch"
  /** Kapsayıcı genişliğini doldurur; düğmeler eşit paylaşır. */
  fullWidth?: boolean
  className?: string
}

const SIZE = {
  sm: "h-[26px] px-3 text-[0.8125rem]",
  md: "h-7 px-3.5 text-[0.8125rem]",
  lg: "h-8 px-3 text-[0.9375rem]",
  touch: "h-11 px-3.5 text-[0.9375rem] md:h-7 md:px-3.5 md:text-[0.8125rem]",
} as const

/**
 * Segment denetimi — HIG › Segmented controls + F'nin hareketi.
 *
 * - Başparmak seçili düğmenin konumuna ve **genişliğine** yayla kayar
 *   (etiketler eşit uzunlukta değil: "Liste" / "Çizelge").
 * - Başparmak sürüklenebilir: 1:1 takip, uçlarda lastik bant, bırakınca
 *   hız yansıtılır ve en yakın seçeneğe oturur.
 * - Klavye: ← → (↑ ↓) ile değişir, Home/End uçlara gider; tek sekme durağı.
 * - Seçili etiket kalınlaşır ama genişlik değişmez (kalın kopya yer ayırır).
 */
export function SegmentedControl<T extends string = string>({
  items,
  value,
  onValueChange,
  size = "md",
  fullWidth = false,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const { transition, reduce } = useMotionPreset()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const x = useMotionValue(0)
  const width = useMotionValue(0)
  const [measured, setMeasured] = React.useState(false)
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value)
  )
  const indexRef = React.useRef(index)
  const dragging = React.useRef(false)
  const suppressClick = React.useRef(false)

  const rects = React.useCallback(
    () =>
      btnRefs.current.map((b) => ({
        left: b?.offsetLeft ?? 0,
        width: b?.offsetWidth ?? 0,
      })),
    []
  )

  const moveTo = React.useCallback(
    (i: number, velocity?: number, instant?: boolean) => {
      const r = rects()[i]
      if (!r) return
      // Hareket azaltılmışsa başparmak kaymaz, yerine oturur
      if (instant || reduce) {
        x.jump(r.left)
        width.jump(r.width)
        return
      }
      const bouncy = velocity !== undefined && Math.abs(velocity) > 500
      animate(x, r.left, transition(bouncy ? "momentum" : "snappy", velocity))
      animate(width, r.width, transition("snappy"))
    },
    [rects, reduce, transition, width, x]
  )

  // İlk ölçüm ve boyut değişimi: anında yerleş
  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    moveTo(indexRef.current, undefined, true)
    setMeasured(true)
    const ro = new ResizeObserver(() => {
      if (!dragging.current) moveTo(indexRef.current, undefined, true)
    })
    ro.observe(root)
    btnRefs.current.forEach((b) => b && ro.observe(b))
    return () => ro.disconnect()
  }, [moveTo, items.length])

  // Değer dışarıdan değişince yayla git
  React.useEffect(() => {
    if (indexRef.current === index) return
    indexRef.current = index
    if (!dragging.current) moveTo(index)
  }, [index, moveTo])

  function select(i: number, velocity?: number, focus?: boolean) {
    const enabled = items
      .map((it, k) => (it.disabled ? -1 : k))
      .filter((k) => k >= 0)
    if (enabled.length === 0) return
    const target = enabled.includes(i) ? i : nearest(enabled, i)
    indexRef.current = target
    moveTo(target, velocity)
    btnRefs.current[target]?.scrollIntoView({ block: "nearest", inline: "nearest" })
    if (focus) btnRefs.current[target]?.focus({ preventScroll: true })
    if (items[target].value !== value) onValueChange(items[target].value)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = items.length - 1
    let next: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(last, index + 1)
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, index - 1)
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = last
    if (next === null) return
    e.preventDefault()
    select(next, undefined, true)
  }

  // Başparmağı sürükleme: eşik sonrası 1:1, uçlarda lastik bant
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    const root = rootRef.current
    if (!root || !measured) return
    const rootBox = root.getBoundingClientRect()
    const thumbLeft = rootBox.left + x.get() - root.scrollLeft
    const px = e.clientX
    if (px < thumbLeft - 4 || px > thumbLeft + width.get() + 4) return

    const startX = px
    const base = x.get()
    const pointerId = e.pointerId
    let started = false

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const dx = ev.clientX - startX
      if (!started) {
        if (Math.abs(dx) < 3) return
        started = true
        dragging.current = true
        x.stop()
        try {
          root.setPointerCapture(pointerId)
        } catch {
          // yok say
        }
      }
      const r = rects()
      const min = r[0].left
      const max = r[r.length - 1].left
      const w = r[0].width || 40
      let t = base + dx
      if (t < min) t = min + rubberband(t - min, w)
      if (t > max) t = max + rubberband(t - max, w)
      x.set(t)
      // Genişlik başparmağın altındaki düğmeye uyar
      const k = r.map((q) => q.left).indexOf(nearest(r.map((q) => q.left), t))
      if (Math.abs(width.get() - r[k].width) > 0.5) width.set(r[k].width)
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      if (!started) return
      dragging.current = false
      suppressClick.current = true
      window.setTimeout(() => (suppressClick.current = false), 0)
      const v = ev.type === "pointercancel" ? 0 : x.getVelocity()
      const lefts = rects().map((q) => q.left)
      const landing = x.get() + project(v, 0.99)
      select(lefts.indexOf(nearest(lefts, landing)), reduce ? undefined : v)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={rest["aria-label"]}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className={cn(
        // Yer yetmezse metin kırılmaz/taşmaz: denetim kendi içinde yatay kayar
        "scrollbar-none relative isolate max-w-full shrink-0 touch-pan-y overflow-x-auto overscroll-x-contain select-none rounded-full bg-fill p-0.5",
        fullWidth ? "flex w-full" : "inline-flex",
        className
      )}
    >
      <motion.span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0.5 bottom-0.5 left-0 z-0 rounded-full bg-[var(--thumb)] shadow-[var(--shadow-thumb)]",
          !measured && "opacity-0"
        )}
        style={{ x, width }}
      />
      {items.map((item, i) => {
        const selected = i === index
        return (
          <button
            key={item.value}
            ref={(el) => {
              btnRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => {
              if (suppressClick.current) return
              select(i)
            }}
            className={cn(
              "relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap text-label transition-colors duration-150 focus-visible:outline-offset-[-2px] disabled:opacity-40",
              SIZE[size],
              fullWidth && "min-w-fit flex-1 basis-0",
              !selected && "hover:bg-hover",
              // Ölçümden önce (sunucu çıktısı) seçili düğme kendi zeminini taşır
              selected && !measured && "bg-[var(--thumb)] shadow-[var(--shadow-thumb)]"
            )}
          >
            <span className="grid">
              <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">
                {item.label}
              </span>
              <span className={cn("col-start-1 row-start-1", selected && "font-semibold")}>
                {item.label}
              </span>
            </span>
            {item.count !== undefined && (
              <span className="font-medium text-label-2 tabular-nums">
                {item.count.toLocaleString("tr-TR")}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
