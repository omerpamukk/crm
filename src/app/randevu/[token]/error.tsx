"use client";

import { useEffect } from "react";
import { RotateCw, CalendarX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Online randevu sayfası hata sınırı.
 *
 * Bu sayfa müşteriye açıktır — hata durumunda beyaz ekran yerine
 * ne yapacağını bilebileceği bir mesaj görmeli.
 */
export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Randevu sayfası hatası:", error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-5 rounded-[var(--radius)] border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-danger/10 text-danger">
          <CalendarX className="size-6" />
        </span>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">
            Randevu sayfası açılamadı
          </h1>
          <p className="text-sm text-muted-foreground">
            Geçici bir sorun oluştu. Tekrar deneyebilir veya işletmeyi
            telefonla arayarak randevu alabilirsiniz.
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
