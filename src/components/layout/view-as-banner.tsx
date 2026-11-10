"use client";

import { useTransition } from "react";
import { Eye, LogOut, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { exitViewAs } from "@/app/admin/view-as-actions";

/**
 * Ajans yöneticisi bir firmaya girdiğinde içeriğin üstündeki bant.
 * Görüntüleme: turuncu (salt okunur) · Yönetim: kırmızı (değişiklikler firmaya
 * yazılır). "Firmadan çık" admin ekranındaki düğmeyle aynı addır.
 */
export function ViewAsBanner({ businessName, manageMode }: { businessName: string; manageMode: boolean }) {
  const [pending, start] = useTransition();
  const detail = manageMode ? "yönetiyorsunuz, değişiklikler firmaya yazılır" : "görüntülüyorsunuz, salt okunur";
  return (
    <div
      role="status"
      className={cn(
        "mx-2 mt-2 flex min-w-0 items-center gap-2.5 rounded-2xl py-2 pr-2 pl-3.5 text-[0.8125rem] md:mx-4",
        manageMode ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text"
      )}
    >
      {manageMode ? <Pencil aria-hidden className="size-4 shrink-0" /> : <Eye aria-hidden className="size-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate text-label" title={`${businessName} firmasını ${detail}`}>
        <strong className="font-semibold">{businessName}</strong>
        <span className="text-label-2"> firmasındasınız · {detail}</span>
      </span>
      <button
        type="button"
        onClick={() => start(() => exitViewAs())}
        disabled={pending}
        className="pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-[0.8125rem] font-semibold whitespace-nowrap text-label disabled:opacity-45"
      >
        <LogOut aria-hidden className="size-3.5" />
        Firmadan çık
      </button>
    </div>
  );
}
