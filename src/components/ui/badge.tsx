import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Rozet — kısa durum ya da etiket. Kapsül, tek satır.
 * Renk yalnızca anlam taşır: positive (tamam/geldi), warning (dikkat),
 * danger (gecikme/iptal), info (yeni/planlı), secondary (nötr).
 * `tag` — müşteri etiketi (VIP, Taksitli): çerçeveli, renksiz.
 * Durum + simge gerekiyorsa `StatusBadge` (shared/status) kullanın.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0 text-[0.75rem] font-semibold whitespace-nowrap transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary-fill text-on-primary-fill [a]:hover:bg-[color:var(--primary-press)]",
        secondary: "bg-fill text-label-2 [a]:hover:bg-fill-2",
        destructive: "bg-danger-soft text-danger-text [a]:hover:bg-[color:var(--danger-soft-2)]",
        outline: "border-separator-strong text-label-2 [a]:hover:bg-hover",
        tag: "h-[18px] rounded-[5px] border-separator-strong px-1.5 text-[0.6875rem] text-label-2",
        ghost: "text-label-2 hover:bg-hover",
        link: "text-primary-text underline-offset-4 hover:underline",
        positive: "bg-positive-soft text-positive-text",
        warning: "bg-warning-soft text-warning-text",
        danger: "bg-danger-soft text-danger-text",
        info: "bg-info-soft text-info-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
