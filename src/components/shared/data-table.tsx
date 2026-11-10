"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { SwipeRow, type SwipeAction } from "./swipe-row"

export type SortDir = "asc" | "desc"
export type SortState = { key: string; dir: SortDir }

export type DataTableColumn<T> = {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  /** Verilirse başlık tıklanınca bu değere göre sıralanır. */
  sortValue?: (row: T) => string | number | null | undefined
  align?: "left" | "right"
  /** Tablo kabı bu genişlikten darsa sütun gizlenir (kapsayıcı sorgusu). */
  hideBelow?: "@2xl" | "@3xl" | "@4xl" | "@5xl"
  className?: string
  headerClassName?: string
}

const HIDE: Record<NonNullable<DataTableColumn<unknown>["hideBelow"]>, string> = {
  "@2xl": "hidden @2xl:table-cell",
  "@3xl": "hidden @3xl:table-cell",
  "@4xl": "hidden @4xl:table-cell",
  "@5xl": "hidden @5xl:table-cell",
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: readonly T[]
  getRowId: (row: T) => string
  /** Ekran okuyucu için tablo adı. */
  caption: string
  /** Kontrollü sıralama; verilmezse tablo kendi içinde sıralar. */
  sort?: SortState | null
  defaultSort?: SortState
  onSortChange?: (sort: SortState) => void
  /** Onay kutusuyla çoklu seçim. */
  selectable?: boolean
  selectedIds?: ReadonlySet<string>
  onSelectedIdsChange?: (ids: Set<string>) => void
  /** Ayrıntısı açık satır (Indigo dolgu). */
  activeId?: string | null
  /** Satıra tıklayınca / Enter'a basınca. */
  onRowActivate?: (row: T) => void
  /** Telefonda (<768px) tablo yerine çizilen satır. Verilmezse ilk sütun
   *  başlık, ikinci sütun alt satır, son sütun sağda gösterilir. */
  renderMobileRow?: (row: T) => React.ReactNode
  /** Telefonda satır ayırıcısının soldan girintisi (px) — metnin başladığı
   *  yer. Varsayılan 16; satırın solunda Avatar `lg` (44px) varsa 72,
   *  `md` (36px) varsa 64, saat sütunu (48px) varsa 76. */
  mobileInset?: number
  /** Telefonda kaydırarak işlem (SwipeRow). Satır başına `leading` (sağa
   *  tam kaydırma, ör. Geldi) ve `trailing` (sola kaydırınca açılan düğmeler,
   *  ör. Ara · Ödeme al). Kaydırma tek yol olamaz: aynı eylem satırın
   *  ayrıntısında ya da masaüstü sütununda da bulunmalı. `renderMobileRow`
   *  kendi SwipeRow'unu çiziyorsa bunu kullanmayın. */
  mobileSwipe?: (row: T) => { leading?: SwipeAction; trailing?: SwipeAction[] } | null | undefined
  /** Boş liste içeriği (EmptyState). */
  empty?: React.ReactNode
  /** Tablonun altındaki satır (sonuç sayısı, sayfalama). */
  footer?: React.ReactNode
  className?: string
}

/**
 * Veri tablosu deseni — E'nin Müşteriler tablosu.
 * - Başlık araç çubuğunun altında yapışık kalır.
 * - Sıralama: başlığa tıkla (aria-sort); seçim: onay kutusu + tümünü seç.
 * - Satır: zebra, üzerine gelince hafif dolgu, açık satır Indigo dolgu.
 * - Klavye: ↑ ↓ satırlar arası, Enter/Boşluk açar, x seçer.
 * - Telefonda liste satırlarına dönüşür (CSS ile; sunucu çıktısı da doğru).
 *   Ayırıcı metinden başlar (`mobileInset`); satır isteğe bağlı kaydırılır
 *   (`mobileSwipe`).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  sort: sortProp,
  defaultSort,
  onSortChange,
  selectable = false,
  selectedIds,
  onSelectedIdsChange,
  activeId,
  onRowActivate,
  renderMobileRow,
  mobileInset = 16,
  mobileSwipe,
  empty,
  footer,
  className,
}: DataTableProps<T>) {
  const [innerSort, setInnerSort] = React.useState<SortState | null>(defaultSort ?? null)
  const sort = sortProp === undefined ? innerSort : sortProp

  const sorted = React.useMemo(() => {
    if (!sort || sortProp !== undefined) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const val = col.sortValue
    const m = sort.dir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const A = val(a)
      const B = val(b)
      if (A == null && B == null) return 0
      if (A == null) return 1
      if (B == null) return -1
      return (typeof A === "string" ? A.localeCompare(String(B), "tr") : A - Number(B)) * m
    })
  }, [rows, sort, sortProp, columns])

  function toggleSort(key: string) {
    const next: SortState =
      sort?.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    if (sortProp === undefined) setInnerSort(next)
    onSortChange?.(next)
  }

  const picked = selectedIds ?? new Set<string>()
  const allIds = sorted.map(getRowId)
  const allPicked = allIds.length > 0 && allIds.every((id) => picked.has(id))
  const somePicked = !allPicked && allIds.some((id) => picked.has(id))

  function togglePick(id: string) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedIdsChange?.(next)
  }
  function togglePickAll() {
    onSelectedIdsChange?.(allPicked ? new Set() : new Set(allIds))
  }

  function onRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>, row: T) {
    const tr = e.currentTarget
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const sib = (e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling) as HTMLElement | null
      sib?.focus()
    } else if ((e.key === "Enter" || e.key === " ") && onRowActivate && e.target === tr) {
      e.preventDefault()
      onRowActivate(row)
    } else if (e.key.toLowerCase() === "x" && selectable && e.target === tr) {
      e.preventDefault()
      togglePick(getRowId(row))
    }
  }

  if (rows.length === 0 && empty) {
    return <div className={cn("surface", className)}>{empty}</div>
  }

  return (
    <div className={cn("min-w-0", className)}>
      {/* Masaüstü ve tablet: tablo */}
      <div className="surface @container hidden overflow-clip md:block">
        <div className="px-1.5 pb-1.5">
        <table className="w-full border-separate border-spacing-0 text-[0.875rem]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {selectable && (
                <th scope="col" className="sticky top-[var(--toolbar-h)] z-10 w-10 border-b border-separator bg-surface py-0 pr-0 pl-4">
                  <Checkbox
                    checked={allPicked}
                    indeterminate={somePicked}
                    onChange={togglePickAll}
                    label="Tümünü seç"
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sortValue ? (active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                    className={cn(
                      "sticky top-[var(--toolbar-h)] z-10 h-[38px] border-b border-separator bg-surface px-3 text-[0.75rem] font-semibold whitespace-nowrap text-label-2 first:pl-4 last:pr-4",
                      c.align === "right" ? "text-right" : "text-left",
                      c.hideBelow && HIDE[c.hideBelow],
                      c.headerClassName
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "group/sort -mx-1.5 inline-flex h-[26px] items-center gap-[3px] rounded-md px-1.5 font-semibold hover:bg-hover hover:text-label",
                          c.align === "right" && "flex-row-reverse"
                        )}
                      >
                        {c.header}
                        {active && sort!.dir === "desc" ? (
                          <ArrowDown aria-hidden className="size-[13px]" strokeWidth={2.6} />
                        ) : (
                          <ArrowUp
                            aria-hidden
                            className={cn("size-[13px]", !active && "opacity-0 group-hover/sort:opacity-50")}
                            strokeWidth={2.6}
                          />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const id = getRowId(row)
              const isActive = activeId === id
              const isPicked = picked.has(id)
              return (
                <tr
                  key={id}
                  data-active={isActive || undefined}
                  aria-selected={selectable ? isPicked : undefined}
                  tabIndex={onRowActivate ? 0 : undefined}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a, button, input, label")) return
                    onRowActivate?.(row)
                  }}
                  onKeyDown={(e) => onRowKeyDown(e, row)}
                  className={cn(
                    "dt-row group/row outline-none",
                    onRowActivate && "cursor-default",
                    i % 2 === 1 && "dt-zebra"
                  )}
                >
                  {selectable && (
                    <td className="w-10 py-0 pr-0 pl-4">
                      <Checkbox checked={isPicked} onChange={() => togglePick(id)} label="Satırı seç" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-[9px] align-middle first:pl-4 last:pr-4",
                        c.align === "right" && "text-right",
                        c.hideBelow && HIDE[c.hideBelow],
                        c.className
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {footer && (
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-separator px-4 py-2.5 text-subhead whitespace-nowrap text-label-2">
            {footer}
          </div>
        )}
      </div>

      {/* Telefon: liste satırları */}
      <div className="surface overflow-clip md:hidden">
        <ul role="list" aria-label={caption} className="inset-rows" style={{ "--row-inset": `${mobileInset}px` } as React.CSSProperties}>
          {sorted.map((row) => {
            const id = getRowId(row)
            const swipe = mobileSwipe?.(row)
            const wrap = (node: React.ReactNode) =>
              swipe && (swipe.leading || swipe.trailing?.length) ? (
                <SwipeRow leading={swipe.leading} trailing={swipe.trailing}>
                  {node}
                </SwipeRow>
              ) : (
                node
              )
            if (renderMobileRow) return <li key={id}>{wrap(renderMobileRow(row))}</li>
            const [first, second] = columns
            const last = columns[columns.length - 1]
            const content = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{first?.cell(row)}</span>
                  {second && second !== last && (
                    <span className="block truncate text-[0.875rem] text-label-2">{second.cell(row)}</span>
                  )}
                </span>
                {last && last !== first && (
                  <span className="shrink-0 text-[0.9375rem] whitespace-nowrap tabular-nums">{last.cell(row)}</span>
                )}
                {onRowActivate && <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />}
              </>
            )
            return (
              <li key={id}>
                {wrap(
                  onRowActivate ? (
                    <button
                      type="button"
                      onClick={() => onRowActivate(row)}
                      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover active:bg-press focus-visible:outline-offset-[-3px]"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">{content}</div>
                  )
                )}
              </li>
            )
          })}
        </ul>
        {footer && (
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-separator px-4 py-2.5 text-subhead whitespace-nowrap text-label-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  label: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate)
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="m-0 size-[18px] cursor-pointer align-middle accent-[var(--primary-fill)]"
    />
  )
}
