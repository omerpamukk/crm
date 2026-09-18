import { PageHeaderSkeleton, KpiRowSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={6} />
    </div>
  );
}
