import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Gruplanmış liste — HIG › Lists (inset grouped).
 *
 *   <ListGroup title="Açık borç" detail="9 müşteri" action={<Money …/>}>
 *     <ListRow leading={<Avatar name=…/>} title="Oya Sezer" subtitle="Gecikmiş"
 *              trailing={<Money amount={5600} tone="debt" />} href="/cari/…" />
 *   </ListGroup>
 *
 * - Satır ayırıcısı metnin başladığı yerden başlar (`inset`, px).
 * - Başlık grubun üstünde, zeminde durur; grup kenarsız, opak, yuvarlak.
 * - Telefonda satırlar en az 52px (dokunma hedefi 44px üstü).
 */
export function ListGroup({
  title,
  detail,
  action,
  footer,
  inset = 16,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  title?: React.ReactNode
  /** Başlığın yanında soluk kısa bilgi ("14 randevu · 3 tamamlandı"). */
  detail?: React.ReactNode
  /** Başlık satırının sağı (bağlantı, segment denetimi, toplam). */
  action?: React.ReactNode
  /** Grubun altındaki satır (ör. "4 müşteri daha · Tümünü gör"). */
  footer?: React.ReactNode
  /** Satır ayırıcısının soldan girintisi (px). Avatar varsa 64. */
  inset?: number
  className?: string
  children: React.ReactNode
  "aria-label"?: string
}) {
  return (
    <section aria-label={ariaLabel} className={cn("min-w-0", className)}>
      {(title || action) && (
        <div className="mx-1 mb-2 flex min-w-0 items-center gap-2.5">
          {title && <h2 className="section-title shrink-0 whitespace-nowrap">{title}</h2>}
          {detail && (
            <span className="min-w-0 truncate text-subhead text-label-2w">{detail}</span>
          )}
          {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="surface overflow-clip">
        <ul
          role="list"
          className="inset-rows"
          style={{ "--row-inset": `${inset}px` } as React.CSSProperties}
        >
          {children}
        </ul>
        {footer && (
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-separator px-4 py-2 text-subhead whitespace-nowrap text-label-2">
            {footer}
          </div>
        )}
      </div>
    </section>
  )
}

export type ListRowProps = {
  /** Sol: Avatar, simge ya da saat. */
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Üçüncü satır (ör. kırmızı borç). */
  meta?: React.ReactNode
  /** Sağ: tutar, durum, düğme. */
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
  /** Sağda › göster (bağlantı satırlarında varsayılan açık). */
  chevron?: boolean
  /** Seçili satır (ayrıntı bölmesinde açık olan). */
  selected?: boolean
  className?: string
  /** Satırın tamamı için ekran okuyucu adı. */
  "aria-label"?: string
}

/** Liste satırı. `href` → bağlantı, `onClick` → düğme, ikisi de yoksa düz satır. */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  href,
  onClick,
  chevron,
  selected,
  className,
  "aria-label": ariaLabel,
}: ListRowProps) {
  const interactive = Boolean(href || onClick)
  const showChevron = chevron ?? Boolean(href)
  const inner = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] leading-5 font-medium md:text-[0.9375rem]">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-subhead text-label-2">{subtitle}</span>
        )}
        {meta && <span className="mt-0.5 block truncate text-subhead">{meta}</span>}
      </span>
      {(trailing || showChevron) && (
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          {trailing}
          {showChevron && <ChevronRight aria-hidden className="size-4 text-label-3" />}
        </span>
      )}
    </>
  )
  const cls = cn(
    "relative flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left",
    interactive && "transition-colors duration-150 hover:bg-hover active:bg-press focus-visible:outline-offset-[-3px]",
    selected && "bg-primary-soft hover:bg-primary-soft",
    className
  )
  return (
    <li className="relative">
      {href ? (
        <Link href={href} className={cls} aria-label={ariaLabel} aria-current={selected ? "true" : undefined}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel} aria-pressed={selected}>
          {inner}
        </button>
      ) : (
        <div className={cls} aria-label={ariaLabel}>
          {inner}
        </div>
      )}
    </li>
  )
}
