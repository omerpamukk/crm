import { cn } from "@/lib/utils"

/** Tek bir iskelet bloğu. Hareket azaltılmışsa parıltı durur. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton max-w-full", className)} aria-hidden />
}

/** Sayfa başlığı iskeleti (PageHeader ile aynı ölçüler). */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-8 w-48 rounded-full" />
    </div>
  )
}

/** KPI şeridi iskeleti (MetricStrip ile aynı yerleşim). */
export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div data-count={count} className="metric-strip surface grid overflow-clip" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="metric-cell relative space-y-2 px-3.5 py-3 md:px-5 md:py-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

/** Liste/tablo iskeleti. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface overflow-clip" aria-hidden>
      <div className="border-b border-separator px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="inset-rows" style={{ "--row-inset": "64px" } as React.CSSProperties}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Genel sayfa iskeleti: başlık + KPI + tablo. */
export function PageSkeleton({ kpis = 4, rows = 6 }: { kpis?: number; rows?: number }) {
  return (
    <div className="space-y-8" role="status" aria-label="Yükleniyor">
      <PageHeaderSkeleton />
      {kpis > 0 && <KpiRowSkeleton count={kpis} />}
      <TableSkeleton rows={rows} />
    </div>
  )
}
