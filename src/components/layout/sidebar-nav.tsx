"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Flower2, LogOut } from "lucide-react";

import { NAV_SECTIONS, sectionKeyForPath } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SidebarNav({
  businessName,
  displayName,
  roleLabel,
  onNavigate,
}: {
  businessName: string;
  displayName: string;
  roleLabel: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Aktif bölüm varsayılan olarak açık; Ana Menü her zaman açık başlasın.
  const [open, setOpen] = useState<Set<string>>(() => {
    const active = sectionKeyForPath(pathname);
    return new Set(["ana", ...(active ? [active] : [])]);
  });

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Logo / işletme başlığı */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
          <Flower2 className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{businessName}</p>
          <p className="text-xs text-muted-foreground">İşletme Paneli</p>
        </div>
      </div>

      {/* Katlanabilir menü bölümleri */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-1">
          {NAV_SECTIONS.map((section) => {
            const isOpen = open.has(section.key);
            const SectionIcon = section.icon;
            const hasActive = section.items.some(
              (i) =>
                pathname === i.href || pathname.startsWith(`${i.href}/`)
            );

            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => toggle(section.key)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    hasActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <SectionIcon
                    className={cn(
                      "size-4 shrink-0",
                      hasActive && "text-primary"
                    )}
                  />
                  <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider">
                    {section.label}
                  </span>
                  {section.comingSoon && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      Yakında
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground/60 transition-transform",
                      isOpen && "rotate-90"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 mb-1 ml-4 border-l pl-2">
                    {section.comingSoon ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground/70">
                        Çok yakında 🚀
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {section.items.map((item) => {
                          const active =
                            pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);
                          const Icon = item.icon;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={onNavigate}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                                  active
                                    ? "bg-primary font-medium text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <Icon className="size-4 shrink-0" />
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Profil / çıkış */}
      <div className="shrink-0 border-t p-2.5">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Çıkış yap"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Çıkış yap</span>
          </button>
        </div>
      </div>
    </div>
  );
}
