import { cn } from "@/lib/utils";

/** Tek bir iskelet bloğu. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Sayfa başlığı iskeleti. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

/** KPI şeridi iskeleti. */
export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface space-y-3 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Tablo iskeleti. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface overflow-hidden">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Genel sayfa iskeleti: başlık + KPI + tablo. */
export function PageSkeleton({
  kpis = 4,
  rows = 6,
}: {
  kpis?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={kpis} />
      <TableSkeleton rows={rows} />
    </div>
  );
}
