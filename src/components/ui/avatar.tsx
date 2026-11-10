import { cn } from "@/lib/utils"

/** Ad → iki harfli monogram ("Zeynep Arslan" → "ZA"). Türkçe büyük harf. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const letters =
    parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return letters.toLocaleUpperCase("tr-TR")
}

const SIZE = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-[0.8125rem]",
  md: "size-9 text-[0.875rem]",
  lg: "size-11 text-base",
  xl: "size-[72px] text-[1.625rem]",
} as const

/**
 * Gri monogram (Kişiler uygulamasındaki baş harf dairesi). Renk anlam
 * taşımadığı için herkes aynı gri; ad hemen yanında yazılıdır, bu yüzden
 * varsayılan olarak ekran okuyucudan gizlenir.
 */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: keyof typeof SIZE
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-avatar
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-[var(--mono)] font-semibold tracking-[0.02em] text-white select-none",
        SIZE[size],
        className
      )}
    >
      {initials(name)}
    </span>
  )
}
