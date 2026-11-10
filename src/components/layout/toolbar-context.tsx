"use client"

import * as React from "react"
import { createPortal } from "react-dom"

/**
 * Araç çubuğu bağlamı — kabuk (AppShell) ile sayfa (PageHeader) arasında.
 * Sayfa başlığını, büyük başlığın kaydırılıp kaybolduğunu ve sayfanın kendi
 * arama alanı olup olmadığını bildirir; sayfa eylemleri araç çubuğundaki
 * yuvaya (portal) çizilir.
 */
type ToolbarState = {
  /** Küçük başlıkta gösterilecek sayfa adı. */
  title: string | null
  /** Büyük başlık araç çubuğunun altına kaydı mı? */
  titleHidden: boolean
  /** Sayfa kendi aramasını verdiyse genel arama gizlenir. */
  hasSearch: boolean
}

type ToolbarCtx = ToolbarState & {
  slot: HTMLElement | null
  setSlot: (el: HTMLElement | null) => void
  update: (patch: Partial<ToolbarState>) => void
}

const Ctx = React.createContext<ToolbarCtx | null>(null)

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ToolbarState>({
    title: null,
    titleHidden: false,
    hasSearch: false,
  })
  const [slot, setSlot] = React.useState<HTMLElement | null>(null)
  const update = React.useCallback((patch: Partial<ToolbarState>) => {
    setState((s) => {
      const next = { ...s, ...patch }
      return next.title === s.title && next.titleHidden === s.titleHidden && next.hasSearch === s.hasSearch
        ? s
        : next
    })
  }, [])
  const value = React.useMemo(() => ({ ...state, slot, setSlot, update }), [state, slot, update])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useToolbar() {
  return React.useContext(Ctx)
}

/**
 * İçindeki `PageHeader`'ları araç çubuğundan yalıtır: başlık ve eylemler
 * kabuğa bildirilmez. Yalnızca önizleme (vitrin) içindir; gerçek sayfada
 * her ekranın tek `PageHeader`'ı olur.
 */
export function ToolbarIsolation({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={null}>{children}</Ctx.Provider>
}

/**
 * Sayfa eylemlerini araç çubuğuna taşır. Genelde doğrudan değil,
 * `PageHeader`'ın `search` / `secondary` / `primary` prop'larıyla kullanılır.
 * Sıra: arama · ikincil eylemler · tek birincil eylem.
 */
export function PageToolbar({
  search,
  secondary,
  primary,
}: {
  search?: React.ReactNode
  secondary?: React.ReactNode
  primary?: React.ReactNode
}) {
  const tb = useToolbar()
  const update = tb?.update
  const hasSearch = Boolean(search)
  React.useEffect(() => {
    if (!update) return
    update({ hasSearch })
    return () => update({ hasSearch: false })
  }, [hasSearch, update])

  if (!tb?.slot || (!search && !secondary && !primary)) return null
  return createPortal(
    <>
      {search && <div className="hidden min-w-0 md:block">{search}</div>}
      {secondary}
      {primary}
    </>,
    tb.slot
  )
}
