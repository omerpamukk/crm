"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { nearest, project, useMotionPreset } from "@/lib/motion"
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query"

/* --------------------------------------------------------------------------
   Sheet — HIG › Sheets + F'nin hareketi, Radix Dialog erişilebilirliğiyle.

   side="bottom"  telefondaki alt sayfa: iki kademe (detents), tutamaçtan ya da
                  başlıktan sürüklenir, aşağı fırlatınca kapanır, yukarıda
                  lastik bant; içerik kaydırılınca tam boya açılır (alt
                  kademede içerik sığsa bile kaydırılabilir; alttaki
                  düğmelere hep ulaşılır).
   side="right"   masaüstünde sağ panel: başlıktan sağa fırlatınca kapanır.
   side="auto"    telefonda bottom, geniş ekranda right (yeni ekranlar için).
   Varsayılan "right" (eski kullanımlar bozulmasın diye).

   Odak tuzağı, Esc, dış tıklama, kaydırma kilidi ve aria Radix'ten gelir.
   -------------------------------------------------------------------------- */

type SheetCtx = { open: boolean; setOpen: (open: boolean) => void }
const SheetContext = React.createContext<SheetCtx | null>(null)

function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("Sheet bileşenleri <Sheet> içinde kullanılmalı.")
  return ctx
}

function Sheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (openProp === undefined) setInner(v)
      onOpenChange?.(v)
    },
    [onOpenChange, openProp]
  )
  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen])
  return (
    <SheetContext.Provider value={value}>
      <SheetPrimitive.Root data-slot="sheet" open={open} onOpenChange={setOpen} {...props}>
        {children}
      </SheetPrimitive.Root>
    </SheetContext.Provider>
  )
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

type SheetSide = "right" | "left" | "bottom" | "auto"

type SheetContentProps = Omit<
  React.ComponentProps<typeof SheetPrimitive.Content>,
  "asChild" | "forceMount"
> & {
  side?: SheetSide
  /** Alt sayfa kademeleri (ekran yüksekliğinin oranı). İlk değerde açılır. */
  detents?: number[]
  showCloseButton?: boolean
  /** Kapat düğmesinin ekran okuyucu adı. */
  closeLabel?: string
}

const INTERACTIVE = "button, a, input, textarea, select, label, [role=button], [role=switch], [contenteditable=true]"

function SheetContent({
  side = "right",
  detents = [0.62, 0.92],
  showCloseButton = true,
  closeLabel = "Kapat",
  className,
  children,
  ...props
}: SheetContentProps) {
  const { open, setOpen } = useSheet()
  const isPhone = useMediaQuery(PHONE_QUERY)
  const resolved: Exclude<SheetSide, "auto"> =
    side === "auto" ? (isPhone ? "bottom" : "right") : side
  const { transition, reduce } = useMotionPreset()

  return (
    <AnimatePresence>
      {open && (
        <SheetPrimitive.Portal forceMount>
          <SheetPrimitive.Overlay asChild forceMount>
            <motion.div
              data-slot="sheet-overlay"
              className="fixed inset-0 z-50 bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition("default")}
            />
          </SheetPrimitive.Overlay>
          {resolved === "bottom" ? (
            <BottomPanel
              detents={detents}
              reduce={reduce}
              transition={transition}
              onClose={() => setOpen(false)}
              className={className}
              showCloseButton={showCloseButton}
              closeLabel={closeLabel}
              contentProps={props}
            >
              {children}
            </BottomPanel>
          ) : (
            <SidePanel
              side={resolved}
              reduce={reduce}
              transition={transition}
              onClose={() => setOpen(false)}
              className={className}
              showCloseButton={showCloseButton}
              closeLabel={closeLabel}
              contentProps={props}
            >
              {children}
            </SidePanel>
          )}
        </SheetPrimitive.Portal>
      )}
    </AnimatePresence>
  )
}

type PanelProps = {
  reduce: boolean
  transition: ReturnType<typeof useMotionPreset>["transition"]
  onClose: () => void
  className?: string
  showCloseButton: boolean
  closeLabel: string
  contentProps: Omit<SheetContentProps, "side" | "detents" | "showCloseButton" | "closeLabel" | "className" | "children">
  children: React.ReactNode
}

function CloseButton({ label, large }: { label: string; large?: boolean }) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      className={cn(
        "glass pressable absolute z-10 grid place-items-center rounded-full text-label",
        large ? "top-3 right-3 size-11" : "top-3 right-3 size-8"
      )}
    >
      <XIcon className={large ? "size-5" : "size-4"} />
      <span className="sr-only">{label}</span>
    </SheetPrimitive.Close>
  )
}

/* Alt sayfa: kademeler, 1:1 sürükleme, ivme yansıtması, lastik bant */
function BottomPanel({
  detents,
  reduce,
  transition,
  onClose,
  className,
  showCloseButton,
  closeLabel,
  contentProps,
  children,
}: PanelProps & { detents: number[] }) {
  const [vh, setVh] = React.useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight
  )
  React.useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const maxD = Math.max(...detents)
  const height = Math.round(vh * maxD) - 8
  // y=0 en yüksek kademe; diğer kademeler aşağıda
  const snaps = detents.map((d) => height - (Math.round(vh * d) - 8))
  const top = Math.min(...snaps)
  const closedY = height + 24
  const y = useMotionValue(reduce ? snaps[0] : closedY)
  const controls = useDragControls()
  // Alt kademede panelin ekran dışında kalan kısmı kadar boşluk: içerik
  // sığsa bile kaydırılabilir olur, ilk kaydırma sayfayı tam boya açar
  // (grow). Böylece en alttaki düğmelere her zaman ulaşılır.
  const lowest = Math.max(...snaps)
  const hidden = useTransform(y, (v) => Math.max(0, Math.min(v - top, lowest - top)))

  React.useEffect(() => {
    if (!reduce) animate(y, snaps[0], transition("default"))
    // yalnızca açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onDragEnd(_: unknown, info: PanInfo) {
    const v = info.velocity.y
    const landing = y.get() + project(v)
    const target = nearest([...snaps, closedY], landing)
    if (target === closedY) {
      onClose()
      return
    }
    animate(y, target, transition(Math.abs(v) > 300 ? "momentum" : "default", v))
  }

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return
    controls.start(e)
  }

  // Orta kademede içerik kaydırılırsa sayfa önce tam boya açılır (iOS davranışı)
  function grow() {
    if (Math.abs(y.get() - top) > 1) animate(y, top, transition("default"))
  }

  return (
    <SheetPrimitive.Content asChild forceMount {...contentProps}>
      <motion.div
        data-slot="sheet-content"
        data-side="bottom"
        className={cn(
          "glass-strong fixed inset-x-2 bottom-2 z-50 flex flex-col overflow-hidden rounded-[34px] text-label outline-none",
          className
        )}
        style={{ height, y }}
        initial={reduce ? { opacity: 0 } : undefined}
        animate={reduce ? { opacity: 1 } : undefined}
        exit={reduce ? { opacity: 0 } : { y: closedY, transition: transition("exit") }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={{ top, bottom: closedY }}
        dragElastic={{ top: 0.12, bottom: 1 }}
        onDragEnd={onDragEnd}
        onPointerDown={(e) => {
          const t = e.target as HTMLElement
          if (t.closest("[data-sheet-handle]")) startDrag(e)
        }}
      >
        <div
          data-sheet-handle
          aria-hidden
          className="flex h-5 shrink-0 cursor-grab touch-none items-start justify-center pt-1.5"
        >
          <span className="h-[5px] w-9 rounded-full bg-fill-2" />
        </div>
        {showCloseButton && <CloseButton label={closeLabel} large />}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(20px,env(safe-area-inset-bottom))]"
          onScroll={grow}
          onWheel={grow}
        >
          {children}
          <motion.div aria-hidden style={{ height: hidden }} />
        </div>
      </motion.div>
    </SheetPrimitive.Content>
  )
}

/* Sağ (ya da sol) panel: başlıktan sürüklenir, dışa fırlatınca kapanır */
function SidePanel({
  side,
  reduce,
  transition,
  onClose,
  className,
  showCloseButton,
  closeLabel,
  contentProps,
  children,
}: PanelProps & { side: "right" | "left" }) {
  const dir = side === "right" ? 1 : -1
  const ref = React.useRef<HTMLDivElement>(null)
  const off = 460 * dir
  const x = useMotionValue(reduce ? 0 : off)
  const controls = useDragControls()

  React.useEffect(() => {
    if (!reduce) animate(x, 0, transition("default"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onDragEnd(_: unknown, info: PanInfo) {
    const v = info.velocity.x * dir
    const w = ref.current?.offsetWidth ?? 400
    const landing = x.get() * dir + project(v)
    if (v > 350 || (Math.abs(v) <= 350 && landing > w * 0.45)) {
      onClose()
      return
    }
    animate(x, 0, transition(Math.abs(v) > 300 ? "momentum" : "default", info.velocity.x))
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-y-2 z-50 flex",
        side === "right" ? "right-2 left-2 justify-end" : "right-2 left-2 justify-start"
      )}
    >
      <SheetPrimitive.Content asChild forceMount {...contentProps}>
        <motion.div
          ref={ref}
          data-slot="sheet-content"
          data-side={side}
          className={cn(
            "pointer-events-auto relative flex h-full w-full max-w-[26rem] flex-col gap-4 overflow-y-auto overscroll-contain rounded-[20px] bg-background text-label shadow-[var(--shadow-pop)] outline-none",
            className
          )}
          style={{ x }}
          initial={reduce ? { opacity: 0 } : undefined}
          animate={reduce ? { opacity: 1 } : undefined}
          exit={reduce ? { opacity: 0 } : { x: off, transition: transition("exit") }}
          drag="x"
          dragControls={controls}
          dragListener={false}
          dragMomentum={false}
          dragConstraints={side === "right" ? { left: 0, right: 600 } : { left: -600, right: 0 }}
          dragElastic={side === "right" ? { left: 0.08, right: 1 } : { left: 1, right: 0.08 }}
          onDragEnd={onDragEnd}
          onPointerDown={(e) => {
            const t = e.target as HTMLElement
            if (!t.closest("[data-sheet-handle]") || t.closest(INTERACTIVE)) return
            controls.start(e)
          }}
        >
          {showCloseButton && <CloseButton label={closeLabel} />}
          {children}
        </motion.div>
      </SheetPrimitive.Content>
    </div>
  )
}

/** Başlık alanı aynı zamanda sürükleme tutamacıdır. */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      data-sheet-handle
      className={cn("flex cursor-grab touch-none flex-col gap-0.5 p-4 pr-14 select-none", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-headline text-label", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-subhead text-label-2", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
