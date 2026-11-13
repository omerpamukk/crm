"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"

import { mobileTabsForRole, MOBILE_TAB_HREFS } from "@/lib/nav"
import type { UserRole } from "@/types/database"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import { isActivePath } from "./sidebar"

/* Sekme çubuğu simgeleri: dolu (HIG › Tab bars "Prefer filled symbols") */
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[26px]">
      <rect x="3" y="3" width="8" height="8" rx="2.4" />
      <rect x="13" y="3" width="8" height="8" rx="2.4" />
      <rect x="3" y="13" width="8" height="8" rx="2.4" />
      <rect x="13" y="13" width="8" height="8" rx="2.4" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[26px]">
      <rect x="7" y="2" width="2.2" height="4.4" rx="1.1" />
      <rect x="14.8" y="2" width="2.2" height="4.4" rx="1.1" />
      <path
        fillRule="evenodd"
        d="M6.6 4.2h10.8A3.6 3.6 0 0 1 21 7.8v9.6a3.6 3.6 0 0 1-3.6 3.6H6.6A3.6 3.6 0 0 1 3 17.4V7.8a3.6 3.6 0 0 1 3.6-3.6Zm-1.4 5.3v7.8c0 .9.6 1.5 1.5 1.5h10.6c.9 0 1.5-.6 1.5-1.5V9.5Z"
      />
      <rect x="7" y="11.2" width="2.4" height="2.4" rx=".6" />
      <rect x="10.8" y="11.2" width="2.4" height="2.4" rx=".6" />
      <rect x="14.6" y="11.2" width="2.4" height="2.4" rx=".6" />
      <rect x="7" y="15" width="2.4" height="2.4" rx=".6" />
      <rect x="10.8" y="15" width="2.4" height="2.4" rx=".6" />
    </svg>
  )
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[26px]">
      <circle cx="16.6" cy="8.4" r="3" />
      <path d="M16.7 13.3c2.9 0 5.1 1.9 5.1 4.6 0 .7-.5 1.1-1.1 1.1h-3.6c.1-.3.1-.6.1-1 0-1.8-.7-3.4-2-4.5.5-.1 1-.2 1.5-.2Z" />
      <circle cx="9" cy="7.8" r="3.7" />
      <path d="M2.4 19.1c0-3.4 2.9-5.9 6.6-5.9s6.6 2.5 6.6 5.9c0 .8-.5 1.2-1.2 1.2H3.6c-.7 0-1.2-.4-1.2-1.2Z" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[26px]">
      <rect x="3.5" y="5" width="17" height="2.4" rx="1.2" />
      <rect x="3.5" y="10.8" width="17" height="2.4" rx="1.2" />
      <rect x="3.5" y="16.6" width="17" height="2.4" rx="1.2" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[26px]">
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="m15.3 15.3 5.2 5.2" />
    </svg>
  )
}

const TAB_ICON: Record<(typeof MOBILE_TAB_HREFS)[number], () => React.ReactElement> = {
  "/panel": GridIcon,
  "/takvim": CalendarIcon,
  "/musteriler": PeopleIcon,
}

const TAB_CLS =
  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[0.625rem] leading-3 font-semibold whitespace-nowrap transition-transform duration-150 active:scale-[0.94]"

/**
 * Telefon (iOS 26): içeriğin üstünde yüzen cam sekme çubuğu + ayrı arama
 * düğmesi. Seçili sekmede mercek yayla kayar. Sekmede olmayan bir sayfadaysa
 * (Menü'den gelinmiş) "Menü" seçili görünür.
 */
export function TabBar({
  role,
  modules,
  menuOpen,
  onOpenMenu,
  onOpenSearch,
}: {
  role: UserRole
  modules: string[] | null
  menuOpen: boolean
  onOpenMenu: () => void
  onOpenSearch: () => void
}) {
  const pathname = usePathname()
  const tabs = mobileTabsForRole(role, modules)
  const activeHref = tabs.find((t) => isActivePath(pathname, t.href))?.href
  const menuActive = menuOpen || !activeHref

  return (
    <div className="md:hidden">
      <div aria-hidden className="tabbar-edge z-[39]" />
      <nav
        aria-label="Sekmeler"
        className="glass fixed right-[88px] bottom-[max(16px,env(safe-area-inset-bottom))] left-4 z-40 flex h-[62px] rounded-full p-1"
      >
        {tabs.map((t) => {
          const active = !menuOpen && t.href === activeHref
          const Icon = TAB_ICON[t.href as keyof typeof TAB_ICON]
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(TAB_CLS, active ? "text-primary-text" : "text-label")}
            >
              {active && <Lens />}
              <span className="relative">{Icon ? <Icon /> : <t.icon className="size-[26px]" />}</span>
              {/* Yan boşluk yok: 375'te sekme ~65px, "Genel Bakış" ~63px; kesir taşma bile "…" yapıyordu */}
              <span className="relative max-w-full truncate tracking-[-0.01em]">{t.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-current={menuActive && !menuOpen ? "page" : undefined}
          className={cn(TAB_CLS, menuActive ? "text-primary-text" : "text-label")}
        >
          {menuActive && <Lens />}
          <span className="relative">
            <MenuIcon />
          </span>
          <span className="relative">Menü</span>
        </button>
      </nav>
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Ara"
        className="glass pressable fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 grid size-[62px] place-items-center rounded-full text-label"
      >
        <SearchIcon />
      </button>
    </div>
  )
}

function Lens() {
  return (
    <motion.span
      layoutId="tab-lens"
      aria-hidden
      className="absolute inset-0 rounded-full bg-[var(--sel-fill)]"
      transition={spring.default}
    />
  )
}
