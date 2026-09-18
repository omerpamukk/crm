import { PageHeaderSkeleton, Skeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/30 p-3">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
