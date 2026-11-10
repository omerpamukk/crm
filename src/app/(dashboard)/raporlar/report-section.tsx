import { cn } from "@/lib/utils";

/**
 * Raporlar'daki grafik/dağılım bölümü: zeminde başlık, altında opak içerik.
 * Boşsa `empty` metni ne yapılacağını söyler.
 */
export function ReportSection({
  title,
  detail,
  empty,
  className,
  children,
}: {
  title: string;
  detail?: string;
  /** Verilirse içerik yerine gösterilir (bölümde veri yok). */
  empty?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0", className)} aria-label={title}>
      <div className="mx-1 mb-2 flex min-w-0 items-baseline gap-2.5">
        <h2 className="section-title shrink-0 whitespace-nowrap">{title}</h2>
        {detail && <span className="min-w-0 truncate text-subhead text-label-2w">{detail}</span>}
      </div>
      <div className="surface p-4 md:p-5">
        {empty ? <p className="py-6 text-center text-[0.9375rem] text-label-2">{empty}</p> : children}
      </div>
    </section>
  );
}
