"use client";

import { useState } from "react";
import { LogOut, UserX } from "lucide-react";

import { signOutAndClear } from "@/app/admin/view-as-actions";
import { Button } from "@/components/ui/button";
import { AuthCard, AuthFrame } from "@/app/(auth)/auth-shell";

export default function HesapYokPage() {
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await signOutAndClear();
  }

  return (
    <AuthFrame>
      <AuthCard
        icon={UserX}
        title="Hesabınız bir işletmeye bağlı değil"
        description="Bu hesap henüz bir işletmeye atanmamış. Hizmet sağlayıcınızla (ajansınız) iletişime geçin; hesabınızı doğru işletmeye bağlasınlar."
      >
        <Button size="lg" onClick={logout} disabled={out} className="w-full">
          <LogOut />
          {out ? "Çıkış yapılıyor..." : "Çıkış yap"}
        </Button>
      </AuthCard>
    </AuthFrame>
  );
}
