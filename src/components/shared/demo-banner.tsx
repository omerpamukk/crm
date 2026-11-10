import { Info } from "lucide-react"

/**
 * "Demo veri" şeridi — arayüzü hazır ama henüz dış servise bağlanmamış
 * modüllerin üstünde gösterilir. Entegrasyon geldiğinde bu şerit kaldırılır.
 */
export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius)] bg-warning-soft px-4 py-3">
      <Info aria-hidden className="mt-px size-4 shrink-0 text-warning-text" />
      <p className="text-[0.8125rem] leading-relaxed text-label">
        <span className="font-semibold">Demo veri.</span> {children}
      </p>
    </div>
  )
}
