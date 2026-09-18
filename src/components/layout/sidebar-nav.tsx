"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Flower2, LogOut, PanelLeftClose } from "lucide-react";

import { NAV_SECTIONS, sectionKeyForPath, type NavSection } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Bir bölümdeki toplam canlı rozet sayısı (şerit üzerinde nokta göstermek için). */
function sectionBadgeCount(
  section: NavSection,
  badges?: Record<string, number>
): number {
  if (!badges) return 0;
  return section.items.reduce(
    (sum, i) => sum + (i.badge ? badges[i.badge] ?? 0 : 0),
    0
  );
}

/**
 * İkon şeridi + açılır panel.
 * Dar şerit her zaman görünür; bir bölüme gelince/tıklayınca yanında
 * o bölümün öğelerini içeren panel açılır. Böylece 30+ menü öğesi
 * ekranı kalabalıklaştırmaz.
 *
 * Mobilde (MobileNav içinde) `variant="full"` ile düz liste olarak render edilir.
 */
export function SidebarNav({
  businessName,
  displayName,
  roleLabel,
  badges,
  onNavigate,
  variant = "rail",
}: {
  businessName: string;
  displayName: string;
  roleLabel: string;
  badges?: Record<string, number>;
  onNavigate?: () => void;
  variant?: "rail" | "full";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const activeKey = sectionKeyForPath(pathname);
  // Panelde gösterilen bölüm. Varsayılan: aktif sayfanın bölümü.
  const [openKey, setOpenKey] = useState<string | null>(activeKey ?? "ana");
  // Kullanıcı bir bölümü sabitledi mi (tıkladı mı)? Sabitliyse hover kapatmaz.
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sayfa değişince aktif bölüm panelde görünsün — effect yerine render
  // sırasında türet (cascading render yok).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (activeKey) setOpenKey(activeKey);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function hoverOpen(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }

  function hoverLeave() {
    if (pinned) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // Fare şeritten panele geçerken kapanmasın diye kısa gecikme.
    closeTimer.current = setTimeout(() => {
      const k = sectionKeyForPath(pathname);
      setOpenKey(k);
    }, 180);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  const openSection = NAV_SECTIONS.find((s) => s.key === openKey) ?? null;

  // --- Mobil / tam liste görünümü ---
  if (variant === "full") {
    return (
      <div className="flex h-full w-full flex-col bg-sidebar">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Flower2 className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{businessName}</p>
            <p className="text-xs text-muted-foreground">İşletme Paneli</p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.key}>
              <p className="section-label px-2 pb-1.5">{section.label}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      pathname={pathname}
                      badges={badges}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <UserFooter
          displayName={displayName}
          roleLabel={roleLabel}
          loggingOut={loggingOut}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // --- Masaüstü: ikon şeridi + açılır panel ---
  return (
    <div className="flex h-full" onMouseLeave={hoverLeave}>
      {/* Dar ikon şeridi */}
      <div className="flex w-[4.25rem] shrink-0 flex-col items-center border-r bg-sidebar py-3">
        <Link
          href="/panel"
          title={businessName}
          className="focus-ring mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/15"
        >
          <Flower2 className="size-5" />
          <span className="sr-only">{businessName}</span>
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActiveSection = section.key === activeKey;
            const isOpen = section.key === openKey;
            const count = sectionBadgeCount(section, badges);
            return (
              <button
                key={section.key}
                type="button"
                title={section.label}
                onMouseEnter={() => hoverOpen(section.key)}
                onFocus={() => hoverOpen(section.key)}
                onClick={() => {
                  setOpenKey(section.key);
                  setPinned((p) => (openKey === section.key ? !p : true));
                }}
                aria-current={isActiveSection ? "true" : undefined}
                aria-expanded={isOpen}
                className={cn(
                  "focus-ring relative flex size-11 items-center justify-center rounded-xl transition-colors",
                  isActiveSection
                    ? "bg-primary/10 text-primary"
                    : isOpen
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                {count > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-sidebar" />
                )}
                {isActiveSection && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute -left-px h-6 w-0.5 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="sr-only">{section.label}</span>
              </button>
            );
          })}
        </nav>

        <UserMenuButton
          displayName={displayName}
          roleLabel={roleLabel}
          loggingOut={loggingOut}
          onLogout={handleLogout}
        />
      </div>

      {/* Açılır bölüm paneli */}
      <AnimatePresence initial={false}>
        {openSection && (
          <motion.div
            key={openSection.key}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "13.5rem", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            onMouseEnter={() => hoverOpen(openSection.key)}
            className="overflow-hidden border-r bg-sidebar"
          >
            <div className="flex h-full w-[13.5rem] flex-col">
              <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-3">
                <p className="section-label truncate">{openSection.label}</p>
                {pinned && (
                  <button
                    type="button"
                    title="Paneli sabitlemeyi bırak"
                    onClick={() => setPinned(false)}
                    className="focus-ring flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <PanelLeftClose className="size-3.5" />
                    <span className="sr-only">Sabitlemeyi bırak</span>
                  </button>
                )}
              </div>

              {openSection.comingSoon ? (
                <p className="px-3 text-xs text-muted-foreground">Çok yakında</p>
              ) : (
                <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                  {openSection.items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        pathname={pathname}
                        badges={badges}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  badges,
  onNavigate,
}: {
  item: NavSection["items"][number];
  pathname: string;
  badges?: Record<string, number>;
  onNavigate?: () => void;
}) {
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const badgeCount = item.badge ? badges?.[item.badge] ?? 0 : 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.tag && (
        <span className="rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          {item.tag}
        </span>
      )}
      {badgeCount > 0 && (
        <span className="text-[11px] font-semibold tabular-nums text-danger">
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

function UserMenuButton({
  displayName,
  roleLabel,
  loggingOut,
  onLogout,
}: {
  displayName: string;
  roleLabel: string;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="mt-2 flex flex-col items-center gap-1 border-t pt-3">
      <span
        title={`${displayName} · ${roleLabel}`}
        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      >
        {initials(displayName)}
      </span>
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        title="Çıkış yap"
        className="focus-ring flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      >
        <LogOut className="size-4" />
        <span className="sr-only">Çıkış yap</span>
      </button>
    </div>
  );
}

function UserFooter({
  displayName,
  roleLabel,
  loggingOut,
  onLogout,
}: {
  displayName: string;
  roleLabel: string;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="shrink-0 border-t p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials(displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          title="Çıkış yap"
          className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Çıkış yap</span>
        </button>
      </div>
    </div>
  );
}
