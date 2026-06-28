"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function AdminLogout() {
  const router = useRouter();
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await createClient().auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={out}
      title="Çıkış yap"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      <LogOut className="size-4" />
      <span className="sr-only">Çıkış yap</span>
    </button>
  );
}
