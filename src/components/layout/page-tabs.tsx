"use client"

import { usePathname, useRouter } from "next/navigation"

import { itemForPath, navSectionsForRole } from "@/lib/nav"
import type { UserRole } from "@/types/database"
import { SegmentedControl } from "@/components/ui/segmented-control"

/**
 * Aynı işin sayfaları arasında geçiş (ör. Takvim · Liste, Satışlar · Cari
 * Hesap). Menüde tek satır olan öğenin sekmeleri, sayfa başlığının üstünde
 * hep aynı yerde. Rolün ya da modülün göstermediği sekme çıkmaz; tek sekme
 * kalırsa hiç gösterilmez.
 */
export function PageTabs({ role, modules }: { role: UserRole; modules: string[] | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const item = itemForPath(pathname, navSectionsForRole(role, modules))
  const tabs = item?.tabs
  if (!tabs || tabs.length < 2) return null

  const current = tabs.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
  if (!current) return null

  return (
    <div className="scrollbar-none -mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <SegmentedControl
        aria-label={item.label}
        size="touch"
        fullWidth
        items={tabs.map((t) => ({ value: t.href, label: t.label }))}
        value={current.href}
        onValueChange={(href) => router.push(href)}
        className="w-max min-w-full sm:min-w-0"
      />
    </div>
  )
}
