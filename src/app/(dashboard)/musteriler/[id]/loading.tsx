import { PageHeaderSkeleton, KpiRowSkeleton, TableSkeleton } from "@/components/shared/skeletons";

/** Müşteri 360 — 7 paralel sorgu çeken ağır sayfa. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <TableSkeleton rows={6} />
    </div>
  );
}
