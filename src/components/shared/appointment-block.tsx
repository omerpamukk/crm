import * as React from "react"
import { Check, CircleAlert, UserCheck, X, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Randevu bloğu — takvim ve çizelgelerdeki renkli blok (E+F "Çizelge" dili).
 *
 *   planned   Planlandı     vurgu zemini + sol vurgu çizgisi
 *   arrived   Geldi         yeşil zemin + kişi simgesi
 *   completed Tamamlandı    gri zemin + ✓
 *   no_show   Gelmedi       kırmızı zemin + ünlem
 *   cancelled İptal edildi  zeminsiz çerçeve, ad üstü çizili
 *   + highlight             sıradaki randevu: dolu Indigo (yalnız Planlandı)
 *
 * Renk tek başına anlam taşımaz: her durumda simge ya da çizgi de vardır.
 * Tıklanabilir bir düğmedir (ayrıntı açılır); konumu çağıran verir.
 *
 *   <AppointmentBlock status="arrived" title="Zeynep Arslan"
 *     detail="10:30–11:30 · Cilt bakımı" aside="MK" density="regular" />
 */

export type AppointmentTone = "planned" | "arrived" | "completed" | "no_show" | "cancelled"

/** Veritabanındaki durum → blok tonu (bilinmeyen = planlandı). */
export function appointmentTone(status: string | null | undefined): AppointmentTone {
  switch (status) {
    case "arrived":
    case "completed":
    case "no_show":
    case "cancelled":
      return status
    default:
      return "planned"
  }
}

type ToneStyle = { block: string; icon?: LucideIcon; iconClass?: string; dot: string }

const TONES: Record<AppointmentTone, ToneStyle> = {
  planned: {
    block:
      "[--blk:var(--primary-soft)] hover:[--blk:var(--primary-soft-2)] text-label shadow-[inset_3px_0_0_var(--primary)]",
    dot: "bg-primary",
  },
  arrived: {
    block:
      "[--blk:var(--positive-soft)] hover:[--blk:var(--positive-soft-2)] text-label shadow-[inset_3px_0_0_var(--positive-dot)]",
    icon: UserCheck,
    iconClass: "text-positive-text",
    dot: "bg-positive-dot",
  },
  completed: {
    block: "[--blk:var(--fill)] hover:[--blk:var(--fill-2)] text-label-2 shadow-[inset_3px_0_0_var(--label-3)]",
    icon: Check,
    iconClass: "text-label-2",
    dot: "bg-label-3",
  },
  no_show: {
    block:
      "[--blk:var(--danger-soft)] hover:[--blk:var(--danger-soft-2)] text-label shadow-[inset_3px_0_0_var(--danger-dot)]",
    icon: CircleAlert,
    iconClass: "text-danger-text",
    dot: "bg-danger-dot",
  },
  cancelled: {
    block: "[--blk:transparent] hover:[--blk:var(--hover)] text-label-2 shadow-[inset_0_0_0_1px_var(--sep-strong)]",
    icon: X,
    iconClass: "text-label-2",
    dot: "border border-label-3 bg-transparent",
  },
}

/** Durum noktası sınıfı (ay görünümündeki noktalar, açıklama satırı). */
export function appointmentDotClass(tone: AppointmentTone): string {
  return TONES[tone].dot
}

export type AppointmentBlockProps = Omit<React.ComponentPropsWithoutRef<"button">, "title"> & {
  status: string | null | undefined
  /** Müşteri adı (ya da "10:30 Zeynep" gibi kısa metin). */
  title: React.ReactNode
  /** İkinci satır: "10:30–11:30 · Cilt bakımı". */
  detail?: React.ReactNode
  /** Sağ üstte soluk kısa bilgi (personelin baş harfleri). */
  aside?: React.ReactNode
  /**
   * regular: iki satır (≥ 44px) · compact: tek satır, ayrıntı yanında ·
   * tiny: tek satır, yalnızca başlık (ay görünümü çipi, çok kısa blok).
   */
  density?: "regular" | "compact" | "tiny"
  /** Ayrıntısı açık blok: odak halkası. */
  selected?: boolean
  /** Sıradaki randevu (Genel Bakış çizelgesi): dolu Indigo. Yalnızca
   *  Planlandı durumunda etkilidir; diğer durumlar kendi rengini korur. */
  highlight?: boolean
  /** Fareyle üstüne gelince görünen tam metin. */
  hint?: string
}

export const AppointmentBlock = React.forwardRef<HTMLButtonElement, AppointmentBlockProps>(
  function AppointmentBlock(
    { status, title, detail, aside, density = "regular", selected, highlight, hint, className, ...rest },
    ref
  ) {
    const tone = appointmentTone(status)
    const t = TONES[tone]
    const filled = Boolean(highlight) && tone === "planned"
    const Icon = t.icon
    const titleCls = cn("truncate", tone === "cancelled" && "line-through decoration-label-3")
    return (
      <button
        ref={ref}
        type="button"
        data-tone={tone}
        data-highlight={filled || undefined}
        title={hint}
        className={cn(
          // Yarı saydam ton opak yüzeyin üstünde: ızgara çizgileri bloğun altından görünmez
          "pressable relative block min-w-0 overflow-hidden bg-surface bg-[linear-gradient(var(--blk),var(--blk))] text-left transition-[box-shadow] duration-200",
          density === "tiny" ? "rounded-[6px] py-px pr-1.5 pl-2" : "rounded-[9px] pr-2 pl-2.5",
          density === "regular" && "pt-1.5",
          density === "compact" && "flex items-center",
          filled
            ? "text-on-primary-fill shadow-soft [--blk:var(--primary-fill)] hover:[--blk:var(--primary-press)]"
            : t.block,
          selected && "ring-2 ring-primary ring-offset-1 ring-offset-[var(--surface)]",
          className
        )}
        {...rest}
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-1 leading-4",
            density === "tiny" ? "text-[0.75rem] font-medium" : "text-[0.8125rem] font-semibold",
            density === "compact" && "w-full"
          )}
        >
          {Icon && <Icon aria-hidden className={cn("size-3.5 shrink-0", t.iconClass)} strokeWidth={2.4} />}
          <span className={titleCls}>{title}</span>
          {density === "compact" && detail && (
            <span className={cn("min-w-0 shrink truncate font-normal", filled ? "text-[color:var(--on-primary-fill-2)]" : "text-label-2")}>
              {detail}
            </span>
          )}
          {aside && (
            <span
              className={cn(
                "ml-auto shrink-0 pl-1 text-[0.6875rem] font-semibold",
                filled ? "text-[color:var(--on-primary-fill-2)]" : "text-label-2"
              )}
            >
              {aside}
            </span>
          )}
        </span>
        {density === "regular" && detail && (
          <span
            className={cn(
              "mt-0.5 block truncate text-[0.75rem] leading-4",
              filled ? "text-[color:var(--on-primary-fill-2)]" : "text-label-2"
            )}
          >
            {detail}
          </span>
        )}
      </button>
    )
  }
)
