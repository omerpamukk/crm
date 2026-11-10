import { PageHeaderSkeleton, Skeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Yükleniyor">
      <PageHeaderSkeleton />
      <div className="scrollbar-none flex gap-4 overflow-hidden" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface w-72 shrink-0 space-y-2.5 p-3 max-md:hidden">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ))}
        <div className="w-full space-y-3 md:hidden">
          <Skeleton className="h-9 w-full rounded-full" />
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
