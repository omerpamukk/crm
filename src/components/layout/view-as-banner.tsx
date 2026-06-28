"use client";

import { useTransition } from "react";
import { Eye, Pencil, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { exitViewAs } from "@/app/admin/view-as-actions";

export function ViewAsBanner({ businessName, manageMode }: { businessName: string; manageMode: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm",
      manageMode ? "border-rose-300 bg-rose-50 text-rose-900" : "border-amber-300 bg-amber-50 text-amber-900"
    )}>
      <span className="flex items-center gap-2 font-medium">
        {manageMode ? <Pencil className="size-4" /> : <Eye className="size-4" />}
        {manageMode ? (
          <><strong>{businessName}</strong> firmasını <strong>YÖNETİYORSUNUZ</strong> — yaptığınız değişiklikler firmanın verisine yazılır.</>
        ) : (
          <><strong>{businessName}</strong> firmasını görüntülüyorsunuz — salt okunur (değişiklik yapılamaz).</>
        )}
      </span>
      <button
        type="button"
        onClick={() => start(() => exitViewAs())}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
          manageMode ? "border-rose-400 text-rose-900 hover:bg-rose-100" : "border-amber-400 text-amber-900 hover:bg-amber-100"
        )}
      >
        <LogOut className="size-3.5" />
        Admin paneline dön
      </button>
    </div>
  );
}
