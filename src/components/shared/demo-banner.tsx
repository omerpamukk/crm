import { Info } from "lucide-react";

/**
 * "Demo veri" şeridi — arayüzü hazır ama henüz dış servise bağlanmamış
 * modüllerin üstünde gösterilir. Entegrasyon geldiğinde bu şerit kaldırılır.
 */
export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-warning/30 bg-warning/[0.07] px-3.5 py-2.5">
      <Info className="mt-px size-4 shrink-0 text-amber-600" />
      <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Demo veri.</span>{" "}
        {children}
      </p>
    </div>
  );
}
