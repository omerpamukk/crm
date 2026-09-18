"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { NAV_ITEMS } from "@/lib/nav";

/**
 * Üst barın solundaki sayfa adı (referans arayüzdeki gibi ikon + başlık).
 * Aktif rotayı menüden eşleştirir; eşleşme yoksa hiçbir şey göstermez.
 */
export function PageTitleBar() {
  const pathname = usePathname();

  const match =
    NAV_ITEMS.find((i) => pathname === i.href) ??
    NAV_ITEMS.find((i) => pathname.startsWith(`${i.href}/`));

  const Icon = match?.icon ?? LayoutDashboard;
  const label = match?.label ?? "Panel";

  return (
    <div className="hidden min-w-0 items-center gap-2.5 md:flex">
      <Icon className="size-4.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-[0.9375rem] font-semibold tracking-tight">
        {label}
      </span>
    </div>
  );
}
