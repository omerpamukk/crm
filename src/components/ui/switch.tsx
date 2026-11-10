"use client"

import { cn } from "@/lib/utils"

/**
 * Açma/kapama anahtarı — HIG › Toggles.
 *
 *   <Switch checked={on} onCheckedChange={setOn} label="Randevu linki açık" />
 *
 * - Dokunma hedefi 44×48px; görünen anahtar 44×26. Liste satırının sağında
 *   (`ListRow trailing`) ya da bir ayar satırının yanında durur.
 * - Açık: Indigo dolgu; kapalı: gri. Durum yalnızca renkle değil, topun
 *   konumuyla da okunur.
 * - Hareket yaydır (`--ease-spring`); hareket azaltmada kısa geçiş.
 * - `label` ekran okuyucu adıdır (zorunlu). Görünen bir `<Label htmlFor>`
 *   kullanacaksanız `id` verin.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  id,
  className,
  "aria-describedby": describedBy,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  /** Ekran okuyucu adı (zorunlu). */
  label: string
  disabled?: boolean
  id?: string
  className?: string
  "aria-describedby"?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      data-state={checked ? "on" : "off"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-ring group/switch inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full disabled:opacity-45",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-[26px] w-11 rounded-full transition-colors duration-200",
          checked ? "bg-primary-fill" : "bg-fill-2"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-[22px] rounded-full bg-white shadow-soft",
            "transition-transform duration-[var(--dur-spring)] ease-[var(--ease-spring)]",
            "group-active/switch:scale-x-110",
            checked && "translate-x-[18px]"
          )}
          style={{ transformOrigin: checked ? "right center" : "left center" }}
        />
      </span>
    </button>
  )
}
