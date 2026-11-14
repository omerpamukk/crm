import { PageSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return <PageSkeleton kpis={3} rows={7} />;
}
