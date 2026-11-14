"use client";

import { useState } from "react";
import { LogOut, ChevronDown, ShieldCheck } from "lucide-react";

import { signOutAndClear } from "@/app/admin/view-as-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminUserMenu({ email }: { email: string }) {
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await signOutAndClear();
  }

  const initials = (email || "AD").slice(0, 2).toLocaleUpperCase("tr");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Hesap" className="focus-ring hover-tint flex items-center gap-1.5 rounded-full p-1 text-left sm:pr-2.5"
        >
          <span className="grid size-7 place-items-center rounded-full bg-[var(--mono)] text-[10px] font-bold text-white">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-footnote font-medium text-label-2 sm:block">{email}</span>
          <ChevronDown className="hidden size-3.5 text-label-2 sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--mono)] text-xs font-bold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{email}</span>
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <ShieldCheck className="size-3 text-primary" />
              Ajans yöneticisi
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
