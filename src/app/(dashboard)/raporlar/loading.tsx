import { PageHeaderSkeleton, KpiRowSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
    </div>
  );
}
