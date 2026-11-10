import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Düğme — HIG › Buttons. Kapsül biçim; bir görünümde tek `prominent`.
 *
 * Yeni adlar (tercih edilen):
 *   prominent  — tek birincil eylem (Indigo dolgu)
 *   glass      — araç çubuğundaki ikincil eylem (cam kapsül)
 *   secondary  — gri dolgulu ikincil eylem
 *   tinted     — Indigo'nun yumuşak tonu (ör. "Ödeme al" satır içinde)
 *   plain      — zeminsiz metin düğmesi (Indigo metin)
 *   destructive — geri alınamayan eylemin yumuşak kırmızısı
 *   destructive-solid — onay penceresindeki son "Sil"
 * Eski adlar çalışmaya devam eder: default = prominent, outline = secondary,
 * ghost = zeminsiz nötr, link = metin bağlantısı.
 *
 * Basınca anında küçülür, bırakınca yayla geri gelir (.pressable).
 */
const buttonVariants = cva(
  "pressable group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-semibold whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[image:var(--prom-sheen)] bg-primary-fill text-on-primary-fill shadow-[var(--prom-shadow)] hover:bg-[color:var(--primary-press)]",
        prominent:
          "bg-[image:var(--prom-sheen)] bg-primary-fill text-on-primary-fill shadow-[var(--prom-shadow)] hover:bg-[color:var(--primary-press)]",
        glass: "glass text-label hover:brightness-[1.04] aria-expanded:text-primary-text",
        secondary:
          "bg-fill text-label hover:bg-fill-2 aria-expanded:bg-fill-2",
        outline:
          "bg-fill text-label hover:bg-fill-2 aria-expanded:bg-fill-2",
        tinted:
          "bg-primary-soft text-primary-text hover:bg-[color:var(--primary-soft-2)]",
        plain: "text-primary-text hover:bg-hover",
        ghost:
          "text-label hover:bg-hover aria-expanded:bg-hover",
        destructive:
          "bg-danger-soft text-danger-text hover:bg-[color:var(--danger-soft-2)]",
        "destructive-solid":
          "bg-danger text-danger-foreground hover:brightness-95",
        link: "rounded-md px-0 text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 text-[0.875rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-[0.75rem] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3.5 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-[0.9375rem] [&_svg:not([class*='size-'])]:size-[18px]",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
