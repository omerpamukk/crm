import { PageHeaderSkeleton, KpiRowSkeleton, Skeleton, TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Yükleniyor">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <TableSkeleton rows={4} />
        </div>
        <Skeleton className="hidden h-96 w-full rounded-2xl xl:block" />
      </div>
    </div>
  );
}
