import { PageSkeleton } from "@/components/shared/skeletons";

/** Müşteri kartı: 7 paralel sorgu çeken ağır sayfa. */
export default function Loading() {
  return <PageSkeleton kpis={4} rows={6} />;
}
