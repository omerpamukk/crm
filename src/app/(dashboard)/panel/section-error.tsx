"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/shared/error-state";

/** Bölüm verisi gelmediğinde: ne olduğunu söyler, "Tekrar dene" sayfayı yeniler. */
export function SectionError({ title }: { title?: string }) {
  const router = useRouter();
  return <ErrorState title={title} onRetry={() => router.refresh()} />;
}
