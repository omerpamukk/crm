import { PageHeaderSkeleton, KpiRowSkeleton, TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <TableSkeleton rows={5} />
    </div>
  );
}
