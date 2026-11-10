"use client"

import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { SegmentedControl, type SegmentedItem } from "@/components/ui/segmented-control"

/**
 * Filtre jetonu — etkin bir filtreyi gösterir, ✕ ile kaldırılır.
 * Arama alanının içinde (SearchField `tokens`) ya da FilterBar'da durur.
 */
export function FilterToken({
  label,
  title,
  onRemove,
  size = "sm",
}: {
  label: string
  /** Tam açıklama ("Hizmet: Lazer Epilasyon"); ✕ düğmesinin adında kullanılır. */
  title?: string
  onRemove: () => void
  size?: "sm" | "md"
}) {
  return (
    <span
      title={title ?? label}
      className={cn(
        "inline-flex max-w-[10.625rem] shrink-0 items-center gap-0.5 rounded-full bg-primary-soft font-semibold whitespace-nowrap text-primary-text",
        size === "md" ? "h-[30px] pr-1 pl-3 text-[0.8125rem]" : "h-[22px] pr-1 pl-2.5 text-[0.75rem]"
      )}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${title ?? label} filtresini kaldır`}
        className="grid size-[18px] shrink-0 place-items-center rounded-full hover:bg-[color:var(--primary-soft-2)]"
      >
        <XIcon aria-hidden className="size-3" strokeWidth={2.6} />
      </button>
    </span>
  )
}

export type FilterBarProps<T extends string> = {
  /** Kapsam (Aktif / Pasif / Arşiv) — sayılarla. */
  scope?: {
    items: readonly SegmentedItem<T>[]
    value: T
    onValueChange: (value: T) => void
    "aria-label": string
  }
  /** Etkin filtreler. */
  tokens?: { key: string; label: string; title?: string; onRemove: () => void }[]
  onClearAll?: () => void
  /** Sonuç özeti ("128 müşteri"). */
  result?: React.ReactNode
  /** Sağdaki eylemler ("Seç", görünüm düğmesi). Telefonda gizlenir. */
  actions?: React.ReactNode
  className?: string
}

/**
 * Filtre satırı — her listede aynı yerde, aynı biçimde.
 * Solda kapsam çubuğu, sağda sonuç sayısı + eylemler; altında etkin filtre
 * jetonları ("Filtreleri temizle" ile). Telefonda kapsam tam genişlik olur,
 * jetonlar yatay kayan tek satırda durur (asla iki satıra kırılmaz).
 */
export function FilterBar<T extends string>({
  scope,
  tokens = [],
  onClearAll,
  result,
  actions,
  className,
}: FilterBarProps<T>) {
  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {scope && (
          <SegmentedControl
            items={scope.items}
            value={scope.value}
            onValueChange={scope.onValueChange}
            aria-label={scope["aria-label"]}
            className="w-full md:w-auto md:min-w-[min(21.25rem,100%)]"
            fullWidth
            size="md"
          />
        )}
        {(result || actions) && (
          <div className="hidden shrink-0 items-center gap-1 md:flex">
            {result && (
              <span className="mr-1.5 text-subhead whitespace-nowrap text-label-2w" aria-live="polite">
                {result}
              </span>
            )}
            {actions}
          </div>
        )}
      </div>
      {tokens.length > 0 && (
        <div className="scrollbar-none -mx-4 flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {tokens.map((t) => (
            <FilterToken key={t.key} label={t.label} title={t.title} onRemove={t.onRemove} size="md" />
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-[30px] shrink-0 rounded-full px-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-primary-text hover:bg-hover"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      )}
      {result && (
        <p className="text-subhead whitespace-nowrap text-label-2w md:hidden" aria-hidden>
          {result}
        </p>
      )}
    </div>
  )
}
