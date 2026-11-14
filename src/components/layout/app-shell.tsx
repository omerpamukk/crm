"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { PanelLeft, Search } from "lucide-react"

import type { UserRole } from "@/types/database"
import { pageLabelForPath } from "@/lib/nav"
import { PageTabs } from "./page-tabs"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { ThemeToggle } from "./account-menu"
import { CommandPalette } from "./command-palette"
import { MobileMenu } from "./mobile-menu"
import { Notifications, type AppNotification } from "./notifications"
import { PageTransition } from "./page-transition"
import { Sidebar } from "./sidebar"
import { TabBar } from "./tab-bar"
import { ToolbarProvider, useToolbar } from "./toolbar-context"
import { ViewAsBanner } from "./view-as-banner"
import { SIDEBAR_HIDDEN_COOKIE } from "./shell-cookies"

const WIDE = "(min-width: 1280px)"

export type AppShellProps = {
  businessName: string
  /** İşletme logosu; yoksa baş harf gösterilir. */
  businessLogo?: string | null
  displayName: string
  roleLabel: string
  role: UserRole
  /** Açık modüller (src/lib/modules.ts); null = hepsi açık. */
  modules: string[] | null
  badges: Record<string, number>
  counts: Record<string, number>
  notifications: AppNotification[]
  impersonating: boolean
  manageMode: boolean
  /** ≥1280px'te kenar çubuğu gizli mi (çerezden; yenilemede sıçramaz). */
  initialSidebarHidden: boolean
  initialCollapsedGroups: string[]
  children: React.ReactNode
}

/**
 * Uygulama kabuğu (E+F).
 *
 * ≥1280px   yüzen cam kenar çubuğu (gizle/göster) + zeminsiz araç çubuğu
 * 768–1279  kenar çubuğu gizli; araç çubuğundaki düğmeyle içeriğin üstüne açılır
 * <768      yüzen cam sekme çubuğu (Genel Bakış · Takvim · Müşteriler · Menü)
 *           + ayrı arama düğmesi; sağ üstte sayfanın birincil eylemi (cam "+")
 *
 * Komut paleti (⌘K), bildirimler, firmadasınız bandı ve çıkış buradadır.
 */
export function AppShell(props: AppShellProps) {
  return (
    <ToolbarProvider>
      <Shell {...props} />
    </ToolbarProvider>
  )
}

function Shell({
  businessName,
  businessLogo = null,
  displayName,
  roleLabel,
  role,
  modules,
  badges,
  counts,
  notifications,
  impersonating,
  manageMode,
  initialSidebarHidden,
  initialCollapsedGroups,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const [sbHidden, setSbHidden] = React.useState(initialSidebarHidden)
  const [sbOpen, setSbOpen] = React.useState(false) // 768–1279 üstte açık
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  // Rota değişince üstte açık kenar çubuğu ve menü kapanır
  const [lastPath, setLastPath] = React.useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setSbOpen(false)
    setMenuOpen(false)
  }

  // ⌘K / Ctrl+K → arama
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Kaydırma kenar efekti
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Üstte açık kenar çubuğu: Esc kapatır; geniş ekrana geçince kapanır
  React.useEffect(() => {
    if (!sbOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSbOpen(false)
    const mq = window.matchMedia(WIDE)
    const onMq = () => mq.matches && setSbOpen(false)
    window.addEventListener("keydown", onKey)
    mq.addEventListener("change", onMq)
    // Açılınca odak ilk bağlantıya
    document.querySelector<HTMLElement>("#kenar-cubugu a")?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener("keydown", onKey)
      mq.removeEventListener("change", onMq)
    }
  }, [sbOpen])

  function toggleSidebar() {
    if (window.matchMedia(WIDE).matches) {
      setSbHidden((h) => {
        const next = !h
        document.cookie = `${SIDEBAR_HIDDEN_COOKIE}=${next ? 1 : 0}; path=/; max-age=31536000; samesite=lax`
        return next
      })
    } else {
      setSbOpen((o) => !o)
    }
  }

  return (
    <div data-sb-hidden={sbHidden} data-sb-open={sbOpen} className="relative flex min-h-svh w-full flex-col">
      <div aria-hidden className="app-wall" />
      <a
        href="#icerik"
        className="glass sr-only z-[80] rounded-full px-4 py-2 text-[0.875rem] font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        İçeriğe geç
      </a>

      <Sidebar
        id="kenar-cubugu"
        businessName={businessName}
        businessLogo={businessLogo}
        displayName={displayName}
        roleLabel={roleLabel}
        role={role}
        modules={modules}
        badges={badges}
        counts={counts}
        initialCollapsed={initialCollapsedGroups}
        onNavigate={() => setSbOpen(false)}
      />
      {/* 768–1279: üstte açık kenar çubuğunun dışına tıklayınca kapanır */}
      {sbOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Menüyü kapat"
          onClick={() => setSbOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/10 xl:hidden"
        />
      )}

      <div className="shell-main flex min-w-0 flex-1 flex-col">
        {impersonating && <ViewAsBanner businessName={businessName} manageMode={manageMode} />}
        <Toolbar
          scrolled={scrolled}
          notifications={notifications}
          onToggleSidebar={toggleSidebar}
          sidebarExpanded={sbOpen || !sbHidden}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        {/* İçerik yatayda asla sayfayı kaydırmaz: taşan içerik kendi kabında kayar */}
        <main
          id="icerik"
          tabIndex={-1}
          className="relative min-w-0 flex-1 overflow-x-clip px-4 pt-1 pb-36 outline-none md:px-6 md:pb-14 xl:px-8"
        >
          <div className="page-shell">
            <PageTabs role={role} modules={modules} />
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <TabBar
        role={role}
        modules={modules}
        menuOpen={menuOpen}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenSearch={() => setPaletteOpen(true)}
      />
      <MobileMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        role={role}
        modules={modules}
        businessName={businessName}
        displayName={displayName}
        roleLabel={roleLabel}
        badges={badges}
        counts={counts}
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} role={role} modules={modules} />
      <Toaster />
    </div>
  )
}

/** ⌘K (Apple) ya da Ctrl K (diğerleri); sunucuda ⌘K. */
function ShortcutHint() {
  const mac = React.useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true
  )
  return <>{mac ? "⌘K" : "Ctrl K"}</>
}

/**
 * Araç çubuğu (HIG › Toolbars): zemin yok, öğeler cam kapsüllerde.
 * İçerik altından geçerken kenar efekti belirir; büyük başlık kayınca
 * küçük başlık görünür. Sağda sayfanın eylemleri (PageHeader → yuva).
 */
function Toolbar({
  scrolled,
  notifications,
  onToggleSidebar,
  sidebarExpanded,
  onOpenSearch,
}: {
  scrolled: boolean
  notifications: AppNotification[]
  onToggleSidebar: () => void
  sidebarExpanded: boolean
  onOpenSearch: () => void
}) {
  const pathname = usePathname()
  const tb = useToolbar()
  const title = tb?.title ?? pageLabelForPath(pathname) ?? ""
  const showTitle = Boolean(tb?.titleHidden && title)

  return (
    <header
      data-scrolled={scrolled}
      className="toolbar-edge sticky top-0 z-30 flex h-[var(--toolbar-h)] items-center gap-3 px-4 pt-[env(safe-area-inset-top)] md:pr-4 md:pl-3"
    >
      {/* Sol: kenar çubuğu düğmesi + küçük başlık (masaüstü) · bildirimler (telefon) */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Kenar çubuğunu göster ya da gizle"
          aria-controls="kenar-cubugu"
          aria-expanded={sidebarExpanded}
          title="Kenar çubuğu"
          className="glass pressable hidden size-9 shrink-0 place-items-center rounded-full text-label hover:brightness-[1.04] md:grid"
        >
          <PanelLeft aria-hidden className="size-[18px]" />
        </button>
        <div className="md:hidden">
          <Notifications notifications={notifications} />
        </div>
        <span
          aria-hidden
          className={cn(
            "hidden min-w-0 truncate text-[0.9375rem] font-semibold transition-[opacity,transform] duration-200 md:block",
            showTitle ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          )}
        >
          {title}
        </span>
      </div>

      {/* Telefon: ortada küçük başlık */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-[76px] truncate text-center text-[1.0625rem] font-semibold transition-[opacity,transform] duration-200 md:hidden",
          showTitle ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        )}
      >
        {title}
      </span>

      {/* Sağ: tema · bildirimler · arama · sayfa eylemleri */}
      <div className="flex shrink-0 items-center gap-2.5">
        <ThemeToggle className="glass pressable hidden size-9 md:grid shrink-0 place-items-center rounded-full text-label hover:brightness-[1.04]" />
        <div className="hidden md:block">
          <Notifications notifications={notifications} />
        </div>
        {!tb?.hasSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="glass pressable hidden h-9 w-[13.75rem] items-center gap-2 rounded-full pr-2 pl-3 text-left text-[0.875rem] text-label-3 md:flex lg:w-[16.25rem]"
          >
            <Search aria-hidden className="size-4 shrink-0 text-label-2" />
            <span className="min-w-0 flex-1 truncate">Ara</span>
            <kbd className="rounded-md bg-fill px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold text-label-2">
              <ShortcutHint />
            </kbd>
          </button>
        )}
        <span ref={tb?.setSlot} className="contents" />
      </div>
    </header>
  )
}
