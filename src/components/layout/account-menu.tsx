"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react"

import { signOutAndClear } from "@/app/admin/view-as-actions"
import { Avatar } from "@/components/ui/avatar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const THEME_OPTIONS = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const
export type ThemeValue = (typeof THEME_OPTIONS)[number]["value"]

/** Tema seçimi; sunucuda ve ilk boyamada "system" döner (uyumsuzluk yok). */
export function useThemeChoice() {
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const value = (mounted ? theme : "system") as ThemeValue
  return { value: value ?? "system", setTheme }
}

/** Çıkış: sunucuda firma oturumunu ve çerezleri temizler. */
export function useSignOut() {
  const [pending, setPending] = React.useState(false)
  return {
    pending,
    signOut: async () => {
      setPending(true)
      await signOutAndClear()
    },
  }
}

/** Telefondaki Menü sayfası için tema segmenti. */
export function ThemeSegment() {
  const { value, setTheme } = useThemeChoice()
  return (
    <SegmentedControl
      aria-label="Görünüm"
      items={THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onValueChange={setTheme}
      fullWidth
      size="lg"
    />
  )
}

/**
 * Kenar çubuğunun altındaki kullanıcı menüsü: ad ve rol; Görünüm
 * (Açık / Koyu / Sistem — resepsiyonda ortak bilgisayar için); Çıkış.
 */
export function AccountMenu({
  displayName,
  roleLabel,
}: {
  displayName: string
  roleLabel: string
}) {
  const { value, setTheme } = useThemeChoice()
  const { pending, signOut } = useSignOut()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-hover aria-expanded:bg-hover"
        >
          <Avatar name={displayName} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] leading-[1.125rem] font-semibold">{displayName}</span>
            <span className="block truncate text-[0.75rem] leading-4 text-label-2">{roleLabel}</span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-label-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel>Görünüm</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => setTheme(v)}>
          {THEME_OPTIONS.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              <o.icon />
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={pending} onSelect={() => void signOut()}>
          <LogOut />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
