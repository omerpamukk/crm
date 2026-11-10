import { PageSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return <PageSkeleton kpis={4} rows={8} />;
}
