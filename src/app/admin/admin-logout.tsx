"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminUserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await createClient().auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  const initials = (email || "AD").slice(0, 2).toLocaleUpperCase("tr");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2.5 text-left transition-colors hover:bg-muted aria-expanded:bg-muted"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-[10px] font-bold text-white">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-xs font-medium text-muted-foreground sm:block">{email}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-xs font-bold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{email}</span>
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <ShieldCheck className="size-3 text-primary" />
              Süper-Admin
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout} disabled={out}>
          <LogOut className="size-4" />
          {out ? "Çıkış yapılıyor…" : "Çıkış yap"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
