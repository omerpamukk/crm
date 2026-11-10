"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type SearchFieldProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type" | "size"
> & {
  value: string
  onValueChange: (value: string) => void
  /** fill: gri dolgu (içerikte) · glass: cam kapsül (araç çubuğunda) */
  variant?: "fill" | "glass"
  size?: "md" | "lg"
  /** Alanın içinde, yazının solunda gösterilen filtre jetonları. */
  tokens?: React.ReactNode
  /** Ekran okuyucu adı; verilmezse placeholder kullanılır. */
  "aria-label"?: string
}

/**
 * Arama alanı — HIG › Search fields. Kapsül; büyüteç solda, yazınca
 * temizle düğmesi çıkar; Esc önce yazıyı temizler. Filtre jetonları
 * (FilterToken) alanın içinde yazının önünde durabilir.
 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { value, onValueChange, variant = "fill", size = "md", tokens, className, placeholder = "Ara", onKeyDown, ...props },
    ref
  ) {
    const inner = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => inner.current as HTMLInputElement)
    return (
      <label
        className={cn(
          "flex min-w-0 cursor-text items-center gap-1.5 rounded-full pr-1.5 pl-3 transition-[background-color,box-shadow] duration-150",
          size === "lg" ? "h-11 text-[1.0625rem]" : "h-9 text-[0.875rem]",
          variant === "glass"
            ? "glass focus-within:shadow-[var(--glass-hi),var(--glass-shadow),0_0_0_3px_var(--focus)]"
            : "bg-fill focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--focus)]",
          className
        )}
      >
        <SearchIcon aria-hidden className={cn("shrink-0 text-label-2", size === "lg" ? "size-5" : "size-4")} />
        {tokens}
        <input
          ref={inner}
          type="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault()
              e.stopPropagation()
              onValueChange("")
            }
            onKeyDown?.(e)
          }}
          placeholder={placeholder}
          aria-label={props["aria-label"] ?? placeholder}
          autoComplete="off"
          className="h-full min-w-[3.75rem] flex-1 bg-transparent text-label outline-none placeholder:text-label-3 [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        {value && (
          <button
            type="button"
            aria-label="Aramayı temizle"
            onClick={() => {
              onValueChange("")
              inner.current?.focus()
            }}
            className="grid size-5 shrink-0 place-items-center rounded-full bg-label-3 text-surface"
          >
            <XIcon className="size-3" strokeWidth={3} />
          </button>
        )}
      </label>
    )
  }
)
