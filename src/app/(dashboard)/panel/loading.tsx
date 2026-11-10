import { KpiRowSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Yükleniyor">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <div className="grid items-start gap-x-5 gap-y-8 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <TableSkeleton rows={5} />
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}
