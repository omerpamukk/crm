"use client"

import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Common = {
  icon: LucideIcon
  /** Görünen ve ekran okuyucuya söylenen ad ("Randevu oluştur"). */
  label: string
  /** Sayfanın tek birincil eylemi (Indigo). Telefonda sağ üstte cam "+". */
  prominent?: boolean
  /**
   * Telefonda (<768px): "icon" → 44px cam daire; "hidden" → gizli.
   * Birincil eylem her zaman simge olarak görünür.
   */
  mobile?: "icon" | "hidden"
  /** Simgenin köşesindeki sayı (ör. etkin filtre sayısı). */
  badge?: number
  className?: string
}

type AsButton = Common & Omit<React.ComponentPropsWithoutRef<"button">, "children"> & { href?: undefined }
type AsLink = Common & { href: string; onClick?: React.MouseEventHandler<HTMLAnchorElement> }

/**
 * Araç çubuğu düğmesi. Masaüstünde simge + metin kapsül, telefonda simge
 * dairesi. `href` verilirse bağlantı, yoksa düğme; `DialogTrigger asChild`
 * içine konabilir (ref ve olaylar iletilir).
 *
 *   primary={<ToolbarAction prominent icon={Plus} label="Randevu oluştur" href="/randevular?yeni=1" />}
 *   secondary={<ToolbarAction icon={Banknote} label="Ödeme al" href="/tahsilat?yeni=1" />}
 */
export const ToolbarAction = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, AsButton | AsLink>(
  function ToolbarAction(props, ref) {
    const { icon: Icon, label, prominent = false, mobile, badge, className, ...rest } = props
    const mobileMode = prominent ? "icon" : (mobile ?? "hidden")
    const cls = cn(
      "pressable relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold whitespace-nowrap",
      prominent
        ? "bg-[image:var(--prom-sheen)] bg-primary-fill text-on-primary-fill shadow-[var(--prom-shadow)] hover:bg-[color:var(--primary-press)]"
        : "glass text-label hover:brightness-[1.04] aria-expanded:text-primary-text",
      mobileMode === "icon" ? "max-md:size-11 max-md:px-0" : "max-md:hidden",
      className
    )
    const inner = (
      <>
        <Icon aria-hidden className="size-4 shrink-0 max-md:size-[22px]" />
        <span className="max-md:sr-only">{label}</span>
        {badge ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-fill px-1 text-[0.6875rem] font-bold text-on-primary-fill md:hidden"
          >
            {badge}
          </span>
        ) : null}
      </>
    )
    if ("href" in rest && rest.href) {
      const { href, onClick } = rest as AsLink
      return (
        <Link ref={ref} href={href} onClick={onClick} className={cls}>
          {inner}
        </Link>
      )
    }
    const { href: _href, ...buttonProps } = rest as AsButton
    void _href
    return (
      <button ref={ref} type="button" className={cls} {...buttonProps}>
        {inner}
      </button>
    )
  }
)
