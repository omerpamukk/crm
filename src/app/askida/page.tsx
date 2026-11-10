"use client";

import { useState } from "react";
import { LogOut, PauseCircle } from "lucide-react";

import { signOutAndClear } from "@/app/admin/view-as-actions";
import { Button } from "@/components/ui/button";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

export default function AskidaPage() {
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await signOutAndClear();
  }

  return (
    <AuthFrame>
      <AuthCard
        icon={PauseCircle}
        title="Aboneliğiniz askıya alındı"
        description="Panele erişim şu anda duraklatıldı. Erişimi yeniden açmak için hizmet sağlayıcınızla (ajansınız) iletişime geçin."
      >
        <Button size="lg" onClick={logout} disabled={out} className="w-full">
          <LogOut />
          {out ? "Çıkış yapılıyor..." : "Çıkış yap"}
        </Button>
      </AuthCard>
    </AuthFrame>
  );
}
