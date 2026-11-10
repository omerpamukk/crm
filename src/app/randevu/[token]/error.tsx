"use client";

import { useEffect } from "react";
import { CalendarX2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

/**
 * Online randevu sayfası hata sınırı.
 *
 * Bu sayfa müşteriye açıktır: hata durumunda beyaz ekran yerine ne
 * yapabileceğini söyleyen bir mesaj görür.
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
    <AuthFrame>
      <AuthCard
        icon={CalendarX2}
        title="Randevu sayfası açılamadı"
        description="Geçici bir sorun oluştu. Tekrar deneyebilir ya da işletmeyi arayarak randevu alabilirsiniz."
      >
        <Button size="lg" onClick={reset} className="w-full">
          <RotateCw />
          Tekrar dene
        </Button>
      </AuthCard>
    </AuthFrame>
  );
}
