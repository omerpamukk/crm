import { cn } from "@/lib/utils"

/**
 * Paket ilerlemesi (F renkleri): kullanılan/toplam seans çubuğu.
 *  - kalan ≤ 2 → turuncu ve "N kaldı"
 *  - kalan 0  → gri ve "Bitti"
 *  - diğer    → Indigo ve "kullanılan/toplam"
 * Tek seanslık hizmette çubuk yerine "Tek seans" yazılır.
 * Kabının genişliğine uyar (en çok 180px); tablo hücresinde en az genişliği
 * sütun verir (ör. className="min-w-[8rem]").
 */
export function PackageProgress({
  used,
  total,
  label,
  className,
}: {
  used: number
  total: number
  /** Üstte solda (ör. hizmet adı). */
  label?: React.ReactNode
  className?: string
}) {
  const remaining = Math.max(0, total - used)
  const single = total <= 1
  const done = !single && remaining === 0
  const low = !single && !done && remaining <= 2
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const right = single
    ? null
    : done
      ? "Bitti"
      : low
        ? `${remaining} kaldı`
        : `${used}/${total}`

  return (
    <div className={cn("w-full min-w-0 max-w-[11.25rem]", className)}>
      <div className="mb-[5px] flex items-baseline justify-between gap-2">
        {label && <span className="min-w-0 truncate text-[0.875rem]">{label}</span>}
        {right && (
          <span
            className={cn(
              "shrink-0 text-[0.75rem] whitespace-nowrap tabular-nums",
              done || low ? "font-semibold text-warning-text" : "text-label-2"
            )}
          >
            {right}
          </span>
        )}
      </div>
      {single ? (
        <span className="block truncate text-[0.75rem] text-label-2">Tek seans</span>
      ) : (
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={used}
          aria-label={`${total} seansın ${used} tanesi kullanıldı`}
          className="block h-1 w-full overflow-hidden rounded-full bg-fill"
        >
          <span
            className={cn(
              "block h-full rounded-full",
              done ? "bg-label-3" : low ? "bg-warning-dot" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </span>
      )}
    </div>
  )
}
