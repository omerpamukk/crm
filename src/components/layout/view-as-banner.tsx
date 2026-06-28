"use client";

import { useTransition } from "react";
import { Eye, LogOut } from "lucide-react";

import { exitViewAs } from "@/app/admin/view-as-actions";

export function ViewAsBanner({ businessName }: { businessName: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span className="flex items-center gap-2 font-medium">
        <Eye className="size-4" />
        <strong>{businessName}</strong> firmasını görüntülüyorsunuz — salt okunur (değişiklik yapılamaz).
      </span>
      <button
        type="button"
        onClick={() => start(() => exitViewAs())}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
      >
        <LogOut className="size-3.5" />
        Admin paneline dön
      </button>
    </div>
  );
}
