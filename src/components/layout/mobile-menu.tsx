"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, LogOut, Settings } from "lucide-react"

import { navSectionsForRole, type NavItem } from "@/lib/nav"
import { can } from "@/lib/permissions"
import type { UserRole } from "@/types/database"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemeSegment, useSignOut } from "./account-menu"
import { isActivePath } from "./sidebar"

/**
 * Telefondaki "Menü" sekmesi: rolün görebildiği bütün bölümler, Ayarlar,
 * görünüm seçimi ve çıkış — alt sayfada (iki kademe, aşağı fırlatınca kapanır).
 */
export function MobileMenu({
  open,
  onOpenChange,
  role,
  modules,
  businessName,
  displayName,
  roleLabel,
  badges,
  counts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: UserRole
  modules: string[] | null
  businessName: string
  displayName: string
  roleLabel: string
  badges: Record<string, number>
  counts: Record<string, number>
}) {
  const pathname = usePathname()
  const sections = navSectionsForRole(role, modules)
  const { pending, signOut } = useSignOut()
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" detents={[0.62, 0.94]} closeLabel="Menüyü kapat">
        <SheetHeader className="px-2 pt-1 pb-3">
          <SheetTitle className="text-[1.0625rem]">Menü</SheetTitle>
          <SheetDescription className="truncate">{businessName}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.key} aria-label={section.label}>
              <h3 className="mb-1.5 px-4 text-[0.8125rem] font-semibold text-label-2">{section.label}</h3>
              <ul className="inset-rows overflow-clip rounded-[22px] bg-surface" style={{ "--row-inset": "52px" } as React.CSSProperties}>
                {section.items.map((item) => (
                  <li key={item.href}>
                    <MenuRow
                      item={item}
                      active={isActivePath(pathname, item.href)}
                      badge={item.badge ? badges[item.badge] ?? 0 : 0}
                      count={counts[item.href]}
                      onNavigate={close}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section aria-label="Hesap">
            <h3 className="mb-1.5 px-4 text-[0.8125rem] font-semibold text-label-2">Hesap</h3>
            <ul className="inset-rows overflow-clip rounded-[22px] bg-surface" style={{ "--row-inset": "52px" } as React.CSSProperties}>
              <li className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                <Avatar name={displayName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1.0625rem] leading-[1.375rem]">{displayName}</span>
                  <span className="block truncate text-[0.8125rem] text-label-2">{roleLabel}</span>
                </span>
              </li>
              {can(role, "ayarlar") && (
                <li>
                  <MenuRow
                    item={{ href: "/ayarlar", label: "Ayarlar", icon: Settings }}
                    active={isActivePath(pathname, "/ayarlar")}
                    onNavigate={close}
                  />
                </li>
              )}
              <li>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void signOut()}
                  className="flex min-h-[50px] w-full items-center gap-3.5 px-4 text-left text-[1.0625rem] text-danger-text transition-colors hover:bg-hover active:bg-press disabled:opacity-45"
                >
                  <LogOut aria-hidden className="size-[22px] shrink-0" />
                  Çıkış yap
                </button>
              </li>
            </ul>
          </section>

          <section aria-label="Görünüm" className="pb-2">
            <h3 className="mb-1.5 px-4 text-[0.8125rem] font-semibold text-label-2">Görünüm</h3>
            <ThemeSegment />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MenuRow({
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
  onNavigate: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[50px] items-center gap-3.5 px-4 text-[1.0625rem] whitespace-nowrap transition-colors hover:bg-hover active:bg-press focus-visible:outline-offset-[-3px]",
        active && "font-semibold"
      )}
    >
      <Icon aria-hidden className="size-[22px] shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge > 0 ? (
        <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-danger px-1.5 text-[0.8125rem] font-bold text-danger-foreground tabular-nums">
          {badge}
          <span className="sr-only"> gecikmiş</span>
        </span>
      ) : count != null && count > 0 ? (
        <span className="text-[0.9375rem] text-label-2 tabular-nums">{count.toLocaleString("tr-TR")}</span>
      ) : null}
      <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />
    </Link>
  )
}
