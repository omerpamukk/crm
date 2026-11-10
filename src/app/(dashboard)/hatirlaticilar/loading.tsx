import { PageHeaderSkeleton, Skeleton, TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Yükleniyor">
      <PageHeaderSkeleton />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <TableSkeleton rows={5} />
    </div>
  );
}
