"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function HesapYokPage() {
  const router = useRouter();
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await createClient().auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/30 p-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <UserX className="size-8" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h1 className="text-xl font-bold">Hesabınız bir işletmeye bağlı değil</h1>
        <p className="text-sm text-muted-foreground">
          Bu hesap henüz bir işletmeye atanmamış. Lütfen hizmet sağlayıcınız (ajansınız)
          ile iletişime geçin; hesabınızı doğru işletmeye bağlasınlar.
        </p>
      </div>
      <Button variant="outline" onClick={logout} disabled={out}>
        <LogOut className="size-4" />
        Çıkış yap
      </Button>
    </div>
  );
}
