"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMotionPreset } from "@/lib/motion"

/**
 * Açılır bölüm — HIG › Disclosure controls. "Gelişmiş seçenekler kapalı
 * başlar" ilkesinin tek deseni.
 *
 *   <Disclosure title="Gelişmiş">
 *     <Label htmlFor="title">Kural adı</Label>
 *     <Input id="title" … />
 *   </Disclosure>
 *
 * - Varsayılan kapalı. Kontrollü kullanım: `open` + `onOpenChange`.
 * - Üstte ince ayırıcı (formun ya da sayfanın sonunda durur); `divider={false}`
 *   ile kaldırılır.
 * - Açılış yaydır (yükseklik + opaklık); hareket azaltmada yalnızca opaklık.
 * - Kapalıyken içerik DOM'da değildir; form alanı içeriyorsa değerleri
 *   react-hook-form tutar (alan kaybolsa da değer kalır).
 */
export function Disclosure({
  title,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  divider = true,
  className,
  contentClassName,
  children,
}: {
  /** Düğme metni — kısa, tek satır ("Gelişmiş", "Daha fazla filtre"). */
  title: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Üstteki ayırıcı çizgi. */
  divider?: boolean
  className?: string
  /** İçerik kabının sınıfı (aralık, ızgara). Varsayılan `space-y-2`. */
  contentClassName?: string
  children: React.ReactNode
}) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const id = React.useId()
  const { transition, reduce } = useMotionPreset()
  // Animasyon sürerken taşan kısım kırpılır; bitince odak halkası kesilmesin diye açılır
  const [settled, setSettled] = React.useState(open)
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    setSettled(false)
  }

  function toggle() {
    const next = !open
    if (openProp === undefined) setInner(next)
    onOpenChange?.(next)
  }

  return (
    <div className={cn(divider && "border-t border-separator pt-3", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className="focus-ring -mx-2 flex h-9 max-w-full items-center gap-1.5 rounded-lg px-2 text-[0.875rem] font-semibold whitespace-nowrap text-primary-text transition-colors duration-150 hover:bg-hover"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 transition-transform duration-[var(--dur-spring)] ease-[var(--ease-spring)]",
            open && "rotate-180"
          )}
        />
        <span className="truncate">{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            id={id}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={transition("default")}
            onAnimationComplete={() => setSettled(true)}
            style={{ overflow: settled ? "visible" : "hidden" }}
          >
            <div className={cn("pt-3", contentClassName ?? "space-y-2")}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
