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
      {/* Seviye 3: etiket + işlevsel ikon */}
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="icon-chip">
            <Icon className="size-4" />
          </span>
        )}
        <span className="flex-1 truncate text-[0.8125rem] font-medium text-muted-foreground">
          {label}
        </span>
        {hint && (
          <Info
            className="size-3.5 shrink-0 text-muted-foreground/50"
            aria-label={hint}
          />
        )}
      </div>

      {/* Seviye 1: ana değer */}
      <p className={cn("metric-value mt-3", accent)}>{value}</p>

      {/* Seviye 4: karşılaştırma / bağlam */}
      {(hasDelta || comparison || sub) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                up ? "text-positive" : "text-danger"
              )}
            >
              {up ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              %{Math.abs(delta!)}
            </span>
          )}
          {comparison && (
            <span className="text-muted-foreground">{comparison}</span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="focus-ring surface block p-4 transition-colors duration-150 ease-out hover:border-primary/25 hover:bg-muted/30"
      >
        {body}
      </Link>
    );
  }

  return <div className="surface p-4">{body}</div>;
}
