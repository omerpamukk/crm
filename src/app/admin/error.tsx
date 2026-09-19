"use client";

import { useEffect } from "react";
import { RotateCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Platform admin paneli hata sınırı. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin paneli hatası:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-4 rounded-[var(--radius)] border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-danger/10 text-danger">
          <ShieldAlert className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">
            Admin paneli yüklenemedi
          </h1>
          <p className="text-sm text-muted-foreground">
            Beklenmedik bir sorun oluştu. Tekrar denemek sorunu çözmezse
            oturumu kapatıp yeniden girin.
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
