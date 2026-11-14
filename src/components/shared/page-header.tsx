"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { PageToolbar, useToolbar } from "@/components/layout/toolbar-context"

export type PageHeaderProps = {
  /** Büyük başlık — menüdeki adla aynı ("Tek şey, tek ad"). */
  title: string
  /** Başlığın altındaki kısa açıklama. */
  description?: string
  /** Başlığın üstündeki küçük satır (ör. "PERŞEMBE, 5 KASIM"). */
  eyebrow?: React.ReactNode
  /** Başlığın solu: ayrıntı sayfasında Avatar ya da geri düğmesi.
   *  Başlık satırıyla ortalanır; açıklama başlığın hizasından devam eder. */
  leading?: React.ReactNode
  /** Başlık satırının sağındaki bağlam denetimi (dönem segmenti, tarih).
   *  Telefonda başlığın altında tam genişlik olur. */
  context?: React.ReactNode
  /** Araç çubuğundaki arama alanı (sayfaya özel; yoksa genel arama görünür). */
  search?: React.ReactNode
  /** Araç çubuğundaki ikincil eylem(ler) — `ToolbarAction` ya da glass Button. */
  secondary?: React.ReactNode
  /** Araç çubuğundaki TEK birincil eylem — `<ToolbarAction prominent …/>`.
   *  Telefonda sağ üstte cam "+" olur. */
  primary?: React.ReactNode
  /** Eski API: başlık satırının sağındaki düğmeler. Yeni ekranlarda
   *  `primary`/`secondary` kullanın. */
  children?: React.ReactNode
  className?: string
}

/**
 * Sayfa başlığı (HIG › Large titles).
 *
 * - Büyük başlık içerikte durur; kaydırınca araç çubuğunda küçük başlık
 *   belirir (telefonda ortada).
 * - Eylemler sayfanın içinde değil araç çubuğundadır: arama · ikincil ·
 *   birincil. Her ekranda tek birincil eylem, hep aynı yerde.
 * - `children` (eski kullanım) başlığın sağında kalır; sayfalar yeni
 *   prop'lara geçince kaldırılacak.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  leading,
  context,
  search,
  secondary,
  primary,
  children,
  className,
}: PageHeaderProps) {
  const tb = useToolbar()
  const update = tb?.update
  const h1 = React.useRef<HTMLHeadingElement>(null)

  // Küçük başlık için adı bildir
  React.useEffect(() => {
    if (!update) return
    update({ title })
    return () => update({ title: null, titleHidden: false })
  }, [title, update])

  // Büyük başlık araç çubuğunun altına kayınca küçük başlığı göster
  React.useEffect(() => {
    const el = h1.current
    if (!el || !update) return
    const toolbarH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--toolbar-h")) || 60
    const io = new IntersectionObserver(
      ([entry]) => {
        update({ titleHidden: !entry.isIntersecting && entry.boundingClientRect.top < toolbarH })
      },
      { rootMargin: `-${toolbarH}px 0px 0px 0px`, threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [update])

  return (
    <>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4",
          className
        )}
      >
        <div className={cn("min-w-0", leading && "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3")}>
          {eyebrow && <p className="eyebrow col-start-2 mb-0.5 truncate">{eyebrow}</p>}
          {leading && (
            <div className={cn("col-start-1 flex shrink-0 items-center self-center", eyebrow ? "row-start-2" : "row-start-1")}>
              {leading}
            </div>
          )}
          <h1 ref={h1} className="page-title col-start-2 truncate">
            {title}
          </h1>
          {description && (
            <p className="col-start-2 mt-0.5 hidden max-w-2xl text-[0.9375rem] text-label-2w md:block">{description}</p>
          )}
        </div>
        {(context || children) && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 md:shrink-0 md:flex-nowrap">
            {context && <div className="w-full min-w-0 md:w-auto">{context}</div>}
            {children}
          </div>
        )}
      </div>
      <PageToolbar search={search} secondary={secondary} primary={primary} />
    </>
  )
}
