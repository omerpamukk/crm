import Link from "next/link";
import { Info, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  /** Başlığın solundaki ikon (referans arayüzdeki kutucuk). */
  icon?: LucideIcon;
  /** Değerin altındaki karşılaştırma metni, ör. "geçen aya göre". */
  comparison?: string;
  /** Yüzde değişim; pozitifse yeşil, negatifse kırmızı rozet. */
  delta?: number | null;
  /** Ek açıklama satırı. */
  sub?: string | null;
  /** ⓘ ipucu metni. */
  hint?: string;
  /** Değere uygulanacak renk sınıfı (ör. borç için text-danger). */
  accent?: string;
  href?: string;
  children?: React.ReactNode;
};

/**
 * Referans arayüzdeki KPI kartı: üstte ikon kutucuğu + başlık + ⓘ,
 * altta büyük değer + trend rozeti + karşılaştırma metni.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  comparison,
  delta,
  sub,
  hint,
  accent,
  href,
  children,
}: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined;
  const up = (delta ?? 0) >= 0;

  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
        {hint && (
          <Info className="size-4 shrink-0 text-muted-foreground/60" aria-label={hint} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cn("metric-value", accent)}>{value}</span>
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              up
                ? "bg-positive/10 text-positive"
                : "bg-danger/10 text-danger"
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(delta!)}%
          </span>
        )}
        {comparison && (
          <span className="text-xs text-muted-foreground">{comparison}</span>
        )}
      </div>

      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="focus-ring surface block p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
      >
        {body}
      </Link>
    );
  }

  return <div className="surface p-5">{body}</div>;
}
