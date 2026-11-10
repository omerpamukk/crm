import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Durum varyantları. `src/lib/constants.ts` içindeki *StatusVariant
 * eşlemeleriyle aynı adlar: positive · warning · danger · info · secondary.
 * "neutral" = "secondary". Bileşen alan bilgisi taşımaz; hangi durumun hangi
 * varyant olduğuna sayfa (constants) karar verir.
 */
export type StatusVariant = "positive" | "warning" | "danger" | "info" | "secondary" | "neutral"

const DOT: Record<StatusVariant, string> = {
  positive: "bg-positive-dot",
  warning: "bg-warning-dot",
  danger: "bg-danger-dot",
  info: "bg-info-dot",
  secondary: "bg-label-3",
  neutral: "bg-label-3",
}

const TEXT: Record<StatusVariant, string> = {
  positive: "text-positive-text",
  warning: "text-warning-text",
  danger: "text-danger-text",
  info: "text-info-text",
  secondary: "text-label-2",
  neutral: "text-label-2",
}

const ICON: Record<StatusVariant, LucideIcon> = {
  positive: CircleCheck,
  warning: CircleAlert,
  danger: CircleAlert,
  info: Clock,
  secondary: CircleDashed,
  neutral: CircleDashed,
}

/**
 * Durum noktası + soluk metin (müşteri durumu gibi sakin bilgiler):
 * `<StatusDot variant="positive">Aktif</StatusDot>`
 */
export function StatusDot({
  variant,
  children,
  className,
}: {
  variant: StatusVariant
  children?: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem] whitespace-nowrap text-label-2",
        className
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[variant])} />
      {children}
    </span>
  )
}

/**
 * Durum etiketi: simge + renkli metin (randevu durumu gibi işlem bilgisi).
 * Renk tek başına anlam taşımaz; simge ve metin hep birlikte.
 * `<StatusBadge variant="positive">Geldi</StatusBadge>`
 * `icon` ile simge değiştirilebilir (ör. iptal için CircleX).
 */
export function StatusBadge({
  variant,
  children,
  icon,
  className,
}: {
  variant: StatusVariant
  children: React.ReactNode
  icon?: LucideIcon
  className?: string
}) {
  const Icon = icon ?? ICON[variant]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[0.8125rem] font-semibold whitespace-nowrap",
        TEXT[variant],
        className
      )}
    >
      <Icon aria-hidden className="size-[15px] shrink-0" />
      {children}
    </span>
  )
}

/** İptal gibi "kapandı" durumları için hazır simge. */
export const StatusIcons = { cancelled: CircleX, done: CircleCheck, alert: CircleAlert }
