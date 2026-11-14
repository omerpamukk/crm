import { StatusBadge } from "@/components/shared/status";
import { SEGMENTS, type Rhythm } from "@/lib/customer-rhythm";

const PARTS: { key: keyof Rhythm["parts"]; label: string; max: number }[] = [
  { key: "duzen", label: "Düzen", max: 40 },
  { key: "siklik", label: "Sıklık", max: 25 },
  { key: "guvenilirlik", label: "Güvenilirlik", max: 20 },
  { key: "sadakat", label: "Sadakat", max: 15 },
];

/**
 * Müşteri puanı (0035 + src/lib/customer-rhythm.ts): segment, tek cümlelik
 * açıklama ve puanın dört parçası. Puanın neyi ölçtüğü görünür; kara kutu değil.
 */
export function RhythmCard({ rhythm }: { rhythm: Rhythm }) {
  const seg = SEGMENTS[rhythm.segment];
  return (
    <section aria-labelledby="rhythm-title" className="surface grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:gap-8">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="rhythm-title" className="text-headline">
            Müşteri durumu
          </h2>
          <StatusBadge variant={seg.tone}>{seg.label}</StatusBadge>
        </div>
        <p className="text-[0.9375rem] text-label-2">{rhythm.sentence}</p>
      </div>

      <div className="min-w-[13rem] space-y-2.5">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-subhead text-label-2">Müşteri puanı</span>
          <span className="tabular-nums">
            <span className="text-title-3 font-semibold">{rhythm.score}</span>
            <span className="text-subhead text-label-2">/100</span>
          </span>
        </p>
        <ul className="space-y-1.5">
          {PARTS.map((p) => (
            <li key={p.key} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-footnote">
              <span className="text-label-2">{p.label}</span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-fill-2">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((rhythm.parts[p.key] / p.max) * 100)}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-label-2">
                {rhythm.parts[p.key]}/{p.max}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
