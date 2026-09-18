"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsUpDown,
  Flower2,
  LogOut,
  Settings,
  LifeBuoy,
} from "lucide-react";

import { NAV_SECTIONS, type NavItem } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLLAPSE_KEY = "crm.sidebar.collapsed";
const OPEN_SECTIONS_KEY = "crm.sidebar.sections";

function readCollapsed(variant: "desktop" | "full"): boolean {
  if (variant !== "desktop" || typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function readOpenKeys(): Set<string> {
  const all = new Set(NAV_SECTIONS.map((s) => s.key));
  if (typeof window === "undefined") return all;
  try {
    const raw = localStorage.getItem(OPEN_SECTIONS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : all;
  } catch {
    return all;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Sol menü — referans arayüzün yapısı:
 * marka bloğu → kullanıcı seçici → ana menü (düz liste) →
 * katlanabilir bölümler (sayaçlı) → alt bölüm (Ayarlar / Yardım).
 *
 * Masaüstünde daraltılabilir (yalnızca ikonlar). Mobilde `variant="full"`
 * ile MobileNav içindeki çekmecede aynı içerik gösterilir.
 */
export function SidebarNav({
  businessName,
  displayName,
  roleLabel,
  badges,
  counts,
  onNavigate,
  variant = "desktop",
}: {
  businessName: string;
  displayName: string;
  roleLabel: string;
  badges?: Record<string, number>;
  /** Menü öğesi başına gösterilecek toplam kayıt sayısı (href → sayı). */
  counts?: Record<string, number>;
  onNavigate?: () => void;
  variant?: "desktop" | "full";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Tercihler tarayıcıda saklanır; lazy initializer ilk render'da okur.
  // Bu bileşen yalnızca istemcide çalıştığı için (suppressHydrationWarning
  // gerekmeden) güvenli: sunucu tarafında localStorage yok, varsayılan kullanılır.
  const [collapsed, setCollapsed] = useState(() => readCollapsed(variant));
  const [openKeys, setOpenKeys] = useState<Set<string>>(readOpenKeys);

  function toggleSection(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify([...next]));
      } catch {
        // yok say
      }
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // yok say
      }
      return next;
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  const isCollapsed = variant === "desktop" && collapsed;
  const [main, ...rest] = NAV_SECTIONS;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-sidebar transition-[width] duration-200",
        isCollapsed ? "w-[4.5rem]" : "w-[17rem]"
      )}
    >
      {/* Marka bloğu */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <Link
          href="/panel"
          onClick={onNavigate}
          title={businessName}
          className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary text-primary-foreground"
        >
          <Flower2 className="size-4" />
        </Link>
        {!isCollapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {businessName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                CRM Paneli
              </p>
            </div>
            {variant === "desktop" && (
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Menüyü daralt"
                className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
              >
                <ChevronsLeft className="size-4" />
                <span className="sr-only">Menüyü daralt</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Kullanıcı seçici */}
      <div className="px-3 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={displayName}
              className={cn(
                "focus-ring flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border bg-card p-2 text-left transition-colors duration-150 ease-out hover:bg-muted",
                isCollapsed && "justify-center px-0"
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-[11px] font-semibold text-primary">
                {initials(displayName)}
              </span>
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium leading-tight">
                      {displayName}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {roleLabel}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ayarlar" onClick={onNavigate}>
                <Settings className="size-4" />
                Ayarlar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Menü */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {/* Ana menü — bölüm başlığı olmadan düz liste */}
        <ul className="space-y-0.5">
          {main.items.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                pathname={pathname}
                badges={badges}
                counts={counts}
                collapsed={isCollapsed}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>

        {/* Diğer bölümler — katlanabilir */}
        {rest.map((section) => {
          const open = openKeys.has(section.key);
          return (
            <div key={section.key} className="mt-4">
              {isCollapsed ? (
                <div className="my-2 border-t" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={open}
                  className="focus-ring flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left"
                >
                  <ChevronDown
                    className={cn(
                      "size-3 shrink-0 text-muted-foreground transition-transform",
                      !open && "-rotate-90"
                    )}
                  />
                  <span className="section-label flex-1 truncate">
                    {section.label}
                  </span>
                </button>
              )}

              {(open || isCollapsed) && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        pathname={pathname}
                        badges={badges}
                        counts={counts}
                        collapsed={isCollapsed}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Alt bölüm */}
      <div className="shrink-0 space-y-0.5 border-t p-3">
        {variant === "desktop" && isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Menüyü genişlet"
            className="focus-ring mb-1 flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronsLeft className="size-4 rotate-180" />
            <span className="sr-only">Menüyü genişlet</span>
          </button>
        )}
        <FooterLink
          href="/ayarlar"
          label="Ayarlar"
          icon={Settings}
          pathname={pathname}
          collapsed={isCollapsed}
          onNavigate={onNavigate}
        />
        <FooterLink
          href="/gorevler"
          label="Yardım Merkezi"
          icon={LifeBuoy}
          pathname={pathname}
          collapsed={isCollapsed}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  badges,
  counts,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  badges?: Record<string, number>;
  counts?: Record<string, number>;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const badgeCount = item.badge ? badges?.[item.badge] ?? 0 : 0;
  const count = counts?.[item.href];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring relative flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors duration-150 ease-out",
        collapsed ? "justify-center px-0" : "px-2.5",
        active
          ? "bg-primary/[0.07] font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-bar"
          className="absolute -left-3 h-5 w-[3px] rounded-r-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className={cn("size-[18px] shrink-0", active && "text-primary")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.tag && (
            <span className="rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.tag}
            </span>
          )}
          {badgeCount > 0 ? (
            <span className="rounded-[var(--radius-sm)] bg-danger/10 px-1.5 text-[11px] font-medium leading-5 text-danger tabular-nums">
              {badgeCount}
            </span>
          ) : count != null && count > 0 ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {count.toLocaleString("tr-TR")}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}

function FooterLink({
  href,
  label,
  icon: Icon,
  pathname,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Settings;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors duration-150 ease-out",
        collapsed ? "justify-center px-0" : "px-2.5",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  );
}
