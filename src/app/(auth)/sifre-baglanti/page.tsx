"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthCard } from "../auth-shell";
import { useRecoveryLink } from "../use-recovery-link";

/**
 * Şifre sıfırlama e-postasındaki bağlantının indiği sayfa.
 *
 * Middleware listelerinin bilerek dışında: oturumu açık bir tarayıcıda da
 * açılabilmeli (giriş sayfası oturumlu kullanıcıyı /panel'e atar ve
 * bağlantı orada kaybolurdu).
 */
export default function SifreBaglantiPage() {
  const state = useRecoveryLink();

  if (state.status === "checking" || state.status === "verifying") {
    return (
      <AuthCard
        title="Bağlantı doğrulanıyor…"
        description="Birkaç saniye içinde yönlendirileceksiniz."
      />
    );
  }

  return (
    <AuthCard
      title="Bağlantı geçersiz"
      description={
        state.status === "error"
          ? state.message
          : "Bu sayfa yalnızca şifre sıfırlama e-postasındaki bağlantıyla açılır."
      }
      footer={
        <Button size="lg" asChild className="w-full">
          <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
        </Button>
      }
    />
  );
}
