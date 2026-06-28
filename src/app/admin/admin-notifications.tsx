"use client";

import Link from "next/link";
import { Bell, AlertTriangle, Clock, PauseCircle, XCircle, Building2, ShieldCheck, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotifItem, NotifKind } from "@/lib/supabase/notifications";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const KIND_META: Record<NotifKind, { icon: typeof Bell; tone: string }> = {
  expired: { icon: AlertTriangle, tone: "bg-danger/12 text-danger" },
  expiring: { icon: Clock, tone: "bg-warning/15 text-amber-600" },
  suspended: { icon: PauseCircle, tone: "bg-danger/12 text-danger" },
  cancelled: { icon: XCircle, tone: "bg-warning/15 text-amber-600" },
  new_firm: { icon: Building2, tone: "bg-positive/12 text-positive" },
  admin: { icon: ShieldCheck, tone: "bg-primary/10 text-primary" },
};

export function AdminNotifications({ items, count }: { items: NotifItem[]; count: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Bildirimler">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">Bildirimler</span>
          {count > 0 && <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[11px] font-medium text-danger">{count} önemli</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <CheckCircle2 className="size-8 text-positive/60" />
            <p className="text-sm text-muted-foreground">Her şey yolunda. Önemli bir durum yok.</p>
          </div>
        ) : (
          <div className="max-h-[22rem] overflow-y-auto py-1">
            {items.map((it) => {
              const m = KIND_META[it.kind];
              const Icon = m.icon;
              return (
                <DropdownMenuItem key={it.id} asChild className="cursor-pointer px-3 py-2.5">
                  <Link href={it.href ?? "#"} className="flex items-start gap-3">
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", m.tone)}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{it.detail}</span>
                    </span>
                    {it.severity === "high" && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-danger" />}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
        {items.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem asChild className="cursor-pointer justify-center py-2 text-sm font-medium text-primary">
              <Link href="/admin">Tüm firmaları gör</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
