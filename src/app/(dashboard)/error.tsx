"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Dashboard hata sınırı. Bir sayfa render sırasında patlarsa kullanıcı
 * boş/bozuk ekran yerine anlaşılır bir mesaj ve "tekrar dene" görür.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard hatası:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="surface max-w-md space-y-4 p-8 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <TriangleAlert className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">
            Bu sayfa yüklenemedi
          </h1>
          <p className="text-sm text-muted-foreground">
            Beklenmedik bir sorun oluştu. Tekrar denemek sorunu çözmezse
            sayfayı yenileyin.
          </p>
        </div>
        <Button onClick={reset} className="mx-auto">
          <RotateCw className="size-4" />
          Tekrar dene
        </Button>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground">
            Hata kodu: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
