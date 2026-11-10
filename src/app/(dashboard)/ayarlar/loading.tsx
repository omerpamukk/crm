import { PageHeaderSkeleton, Skeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Yükleniyor">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full rounded-full md:h-7 md:w-96" />
      <div className="surface space-y-px overflow-clip" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
