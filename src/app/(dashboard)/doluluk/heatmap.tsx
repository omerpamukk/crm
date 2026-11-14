import { cn } from "@/lib/utils";
import { WEEKDAY_LONG, WEEKDAY_SHORT, type OccCell } from "@/lib/occupancy";

/** Doluluk → dolgu tonu. Renk tek başına anlam taşımaz: hücrede yüzde yazar. */
function tone(pct: number | null): string {
  if (pct == null) return "bg-fill text-label-3";
  if (pct >= 80) return "bg-primary-fill text-on-primary-fill";
  if (pct >= 60) return "bg-primary-fill/75 text-on-primary-fill";
  if (pct >= 40) return "bg-primary-fill/45 text-label";
  if (pct >= 20) return "bg-primary-fill/20 text-label";
  return "bg-primary-fill/[0.07] text-label-2";
}

/**
 * Gün × saat doluluk tablosu. Yalnızca dönemde açık olan günler satır olur.
 * Dar ekranda tablo kendi kabında yatay kayar; sayfa kaymaz.
 */
export function OccupancyHeatmap({ hours, cells }: { hours: number[]; cells: OccCell[] }) {
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => cells.some((c) => c.day === d && c.capacity > 0));
  const at = (day: number, hour: number) => cells.find((c) => c.day === day && c.hour === hour);

  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="w-full min-w-[20rem] border-separate border-spacing-[3px] text-center">
        <caption className="sr-only">Gün ve saate göre doluluk yüzdesi</caption>
        <thead>
          <tr>
            <th scope="col" className="w-9">
              <span className="sr-only">Gün</span>
            </th>
            {hours.map((h) => (
              <th key={h} scope="col" className="text-[0.6875rem] font-semibold text-label-2 tabular-nums">
                {String(h).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <th scope="row" className="pr-1 text-left text-footnote font-semibold text-label-2" title={WEEKDAY_LONG[d]}>
                {WEEKDAY_SHORT[d]}
              </th>
              {hours.map((h) => {
                const c = at(d, h);
                const pct = c?.pct ?? null;
                return (
                  <td
                    key={h}
                    title={`${WEEKDAY_LONG[d]} ${String(h).padStart(2, "0")}:00 · ${pct == null ? "kapalı" : `%${pct} dolu`}`}
                    className={cn("h-8 min-w-6 rounded-md text-[0.6875rem] font-semibold tabular-nums", tone(pct))}
                  >
                    {pct == null ? "–" : pct}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
