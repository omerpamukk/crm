import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
