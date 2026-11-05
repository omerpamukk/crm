"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { authLinkErrorMessage, parseAuthLink } from "@/lib/auth-link";

export type RecoveryLinkState =
  | { status: "checking" }
  | { status: "none" }
  | { status: "verifying" }
  | { status: "error"; message: string };

/**
 * Adresteki şifre sıfırlama bağlantısını oturuma çevirip /yeni-sifre'ye
 * gönderir. Token yalnızca `#` kısmında gelir; sunucu göremez, bu yüzden
 * iş mount'ta tarayıcıda yapılır.
 */
export function useRecoveryLink(): RecoveryLinkState {
  const router = useRouter();
  const [state, setState] = useState<RecoveryLinkState>({ status: "checking" });

  // Adres yalnızca tarayıcıda okunabildiği için durum ilk render'da değil,
  // mount'ta bir kez kurulur — kuralın uyardığı zincirleme render oluşmaz.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const link = parseAuthLink(window.location.hash, window.location.search);
    if (!link) {
      setState({ status: "none" });
      return;
    }

    // Token'lar adres çubuğunda ve geçmişte kalmasın. createClient()'tan
    // önce olmalı: istemci açılışta adresi kendisi de okumaya çalışır.
    window.history.replaceState(null, "", window.location.pathname);

    if (link.kind === "error") {
      setState({ status: "error", message: authLinkErrorMessage(link.code) });
      return;
    }

    setState({ status: "verifying" });
    const fail = (error: unknown) => {
      console.error("setSession:", error);
      setState({ status: "error", message: authLinkErrorMessage("gecersiz") });
    };

    createClient()
      .auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      .then(({ error }) => {
        if (error) return fail(error);
        router.replace("/yeni-sifre");
        router.refresh();
      })
      .catch(fail);
  }, [router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return state;
}
