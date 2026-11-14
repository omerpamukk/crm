"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Settings } from "lucide-react"

import { navSectionsForRole, type NavItem, isItemActive } from "@/lib/nav"
import { can } from "@/lib/permissions"
import type { UserRole } from "@/types/database"
import { cn } from "@/lib/utils"
import { AccountMenu } from "./account-menu"
import { SIDEBAR_GROUPS_COOKIE } from "./shell-cookies"


export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Kenar çubuğu (HIG › Sidebars) — içeriğin üstünde yüzen cam panel.
 * Üstte işletme; gruplar katlanır (tercih çerezde, yenilemede sıçramaz);
 * altta Ayarlar ve kullanıcı menüsü. Rol göremediği sayfayı görmez.
 */
export function Sidebar({
  businessName,
  displayName,
  roleLabel,
  role,
  modules,
  badges,
  counts,
  initialCollapsed,
  onNavigate,
  id,
}: {
  businessName: string
  displayName: string
  roleLabel: string
  role: UserRole
  modules: string[] | null
  badges: Record<string, number>
  counts: Record<string, number>
  /** Kapalı başlayan grup anahtarları (çerezden). */
  initialCollapsed: string[]
  onNavigate?: () => void
  id?: string
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(() => new Set(initialCollapsed))
  const sections = navSectionsForRole(role, modules)
  const navRef = React.useRef<HTMLElement>(null)
  const [moreBelow, setMoreBelow] = React.useState(false)

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      document.cookie = `${SIDEBAR_GROUPS_COOKIE}=${[...next].join(",")}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }

  // Altta daha fazla öğe varsa ince ayırıcı göster
  React.useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const upd = () => setMoreBelow(nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2)
    upd()
    nav.addEventListener("scroll", upd, { passive: true })
    const ro = new ResizeObserver(upd)
    ro.observe(nav)
    return () => {
      nav.removeEventListener("scroll", upd)
      ro.disconnect()
    }
  }, [collapsed])

  const initial = businessName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?"

  return (
    <aside
      id={id}
      aria-label="Ana menü"
      className="shell-sidebar glass-strong flex flex-col overflow-hidden rounded-[20px]"
    >
      <Link
        href="/panel"
        onClick={onNavigate}
        className="mx-2 mt-2.5 mb-1 flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors duration-150 hover:bg-hover"
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-label text-[0.9375rem] font-bold text-[color:var(--bg)]"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] leading-5 font-semibold">{businessName}</span>
      </Link>

      <nav ref={navRef} aria-label="Bölümler" className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-1 pb-3">
        {sections.map((section, si) => {
          // İlk bölüm (Ana Menü) başlıksız düz liste
          const headed = si > 0
          const open = !headed || !collapsed.has(section.key)
          return (
            <div key={section.key} className={cn(si > 0 && "mt-3.5")}>
              {headed && (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`sb-${section.key}`}
                  onClick={() => toggle(section.key)}
                  className="group/head flex h-[26px] w-full items-center justify-between rounded-md px-2.5 text-[0.75rem] font-semibold tracking-[0.01em] text-label-2 hover:text-label"
                >
                  {section.label}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-3.5 transition-[opacity,transform] duration-200",
                      open ? "opacity-0 group-hover/head:opacity-100 group-focus-visible/head:opacity-100" : "-rotate-90"
                    )}
                  />
                </button>
              )}
              <ul id={`sb-${section.key}`} hidden={!open} className="space-y-px">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink
                      item={item}
                      active={isItemActive(pathname, item)}
                      badge={item.badge ? badges[item.badge] ?? 0 : 0}
                      count={counts[item.href]}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className={cn("space-y-1 p-2 pt-2", moreBelow ? "border-t-[0.5px] border-separator-strong" : "border-t-[0.5px] border-transparent")}>
        {can(role, "ayarlar") && (
          <SidebarLink
            item={{ href: "/ayarlar", label: "Ayarlar", icon: Settings }}
            active={isActivePath(pathname, "/ayarlar")}
            onNavigate={onNavigate}
          />
        )}
        <AccountMenu displayName={displayName} roleLabel={roleLabel} />
      </div>
    </aside>
  )
}

function SidebarLink({
  item,
  active,
  badge = 0,
  count,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  badge?: number
  count?: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[34px] items-center gap-2.5 rounded-[10px] px-2.5 text-[0.875rem] whitespace-nowrap transition-colors duration-100",
        active ? "bg-[var(--sel-fill)] font-semibold" : "font-medium hover:bg-hover"
      )}
    >
      <Icon aria-hidden className="size-[18px] shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge > 0 ? (
        <span
          className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[0.75rem] font-bold text-danger-foreground tabular-nums"
          title={`${badge} gecikmiş`}
        >
          {badge}
          <span className="sr-only"> gecikmiş</span>
        </span>
      ) : count != null && count > 0 ? (
        <span className="text-[0.8125rem] text-label-2 tabular-nums">{count.toLocaleString("tr-TR")}</span>
      ) : null}
    </Link>
  )
}
