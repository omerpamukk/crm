"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Bell, CalendarDays, Wallet, Cake, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "./command-palette";

export type AppNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  icon: "appointment" | "debt" | "birthday" | "opportunity";
};

const ICONS: Record<AppNotification["icon"], { icon: LucideIcon; tone: string }> = {
  appointment: { icon: CalendarDays, tone: "bg-primary/10 text-primary" },
  debt: { icon: Wallet, tone: "bg-danger/10 text-danger" },
  birthday: { icon: Cake, tone: "bg-positive/10 text-positive" },
  opportunity: { icon: Sparkles, tone: "bg-warning/12 text-amber-600" },
};

export function TopBar({ notifications }: { notifications: AppNotification[] }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  // Cmd/Ctrl+K → komut paleti
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="flex flex-1 items-center justify-end gap-2 md:justify-between">
        {/* Arama tetiği (masaüstü) */}
        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          className="focus-ring hidden h-9 w-full max-w-sm items-center gap-2.5 rounded-[var(--radius-md)] border bg-card px-3 text-[0.8125rem] text-muted-foreground transition-colors duration-150 ease-out hover:border-input hover:bg-muted/50 md:flex"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">Ara veya komut çalıştır…</span>
          <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          {/* Arama (mobil) */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="focus-ring flex size-9 items-center justify-center rounded-[var(--radius-md)] border bg-card text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Ara"
          >
            <Search className="size-4" />
          </button>

          {/* Bildirimler */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="focus-ring relative flex size-9 items-center justify-center rounded-[var(--radius-md)] border bg-card text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
                aria-label="Bildirimler"
              >
                <Bell className="size-4" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4.5 text-danger-foreground tabular-nums">
                    {notifications.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="border-b px-3 py-2.5">
                <p className="text-sm font-semibold">Bildirimler</p>
                <p className="text-xs text-muted-foreground">İşletmenin bugünkü gündemi</p>
              </div>
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Her şey güncel</p>
              ) : (
                <ul className="max-h-96 overflow-y-auto py-1">
                  {notifications.map((n) => {
                    const { icon: Icon, tone } = ICONS[n.icon];
                    return (
                      <li key={n.id}>
                        <Link href={n.href} className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted">
                          <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]", tone)}>
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium leading-tight">{n.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
