"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>Bağlantı doğrulanıyor…</CardTitle>
          <CardDescription>Birkaç saniye içinde yönlendirileceksin.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bağlantı geçersiz</CardTitle>
        <CardDescription>
          {state.status === "error"
            ? state.message
            : "Bu sayfa yalnızca şifre sıfırlama e-postasındaki bağlantıyla açılır."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
