import { cn } from "@/lib/utils";

/**
 * Yatay çubuk listesi (dağılımlar için): üstte ad ve değer, altında tek renkli
 * çubuk. Renk yalnızca vurgu tokenıdır; anlam adda ve değerde yazılıdır.
 * Dar ekranda da iki satırlı kalır, hiçbir şey kesilmez (ad kısalır).
 */
export function BarList({
  rows,
  format,
  className,
  "aria-label": ariaLabel,
}: {
  rows: readonly { name: string; value: number }[];
  format: (value: number) => string;
  className?: string;
  "aria-label"?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul role="list" aria-label={ariaLabel} className={cn("space-y-3.5", className)}>
      {rows.map((r) => (
        <li key={r.name} className="min-w-0">
          <div className="flex min-w-0 items-baseline justify-between gap-3 text-[0.9375rem]">
            <span className="min-w-0 truncate text-label" title={r.name}>
              {r.name}
            </span>
            <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{format(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fill" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
