"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Cake, CalendarDays, Sparkles, Wallet, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { markAllNotificationsRead } from "./notification-actions"

export type AppNotification = {
  id: string
  title: string
  detail: string
  href: string
  icon: "appointment" | "debt" | "birthday" | "opportunity"
}

const ICONS: Record<AppNotification["icon"], { icon: LucideIcon; tone: string }> = {
  appointment: { icon: CalendarDays, tone: "text-primary!" },
  debt: { icon: Wallet, tone: "text-danger-text!" },
  birthday: { icon: Cake, tone: "text-label-2" },
  opportunity: { icon: Sparkles, tone: "text-label-2" },
}

/** Bildirimler: cam daire düğme + sayı; açılınca cam menü. */
export function Notifications({
  notifications,
  className,
}: {
  notifications: AppNotification[]
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const count = notifications.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Bildirimler, ${count} yeni` : "Bildirimler"}
          className={cn(
            "glass pressable relative grid size-11 shrink-0 place-items-center rounded-full text-label hover:brightness-[1.04] aria-expanded:text-primary-text md:size-9",
            className
          )}
        >
          <Bell aria-hidden className="size-[21px] md:size-[18px]" />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[0.6875rem] font-bold text-danger-foreground tabular-nums md:-top-0.5 md:-right-0.5"
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-16px))] p-1.5">
        <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2">
          <p className="text-[0.9375rem] font-semibold">Bildirimler</p>
          {notifications.some((n) => n.id.startsWith("db-")) && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  await markAllNotificationsRead()
                  router.refresh()
                })
              }}
              className="min-h-0 shrink-0 rounded-md px-1.5 py-0.5 text-[0.8125rem] font-semibold text-primary-text focus:bg-hover focus:text-primary-text"
            >
              Tümünü okundu yap
            </DropdownMenuItem>
          )}
        </div>
        {count === 0 ? (
          <p className="px-2.5 pt-4 pb-6 text-center text-[0.875rem] text-label-2">
            Yeni bildirim yok. Her şey güncel.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const { icon: Icon, tone } = ICONS[n.icon]
              return (
                <li key={n.id}>
                  <DropdownMenuItem
                    asChild
                    className="items-start gap-3 py-2 whitespace-normal focus:bg-hover focus:text-label not-data-[variant=destructive]:focus:**:text-inherit"
                  >
                    <Link href={n.href}>
                      <Icon aria-hidden className={cn("mt-0.5 size-[18px] shrink-0", tone)} />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-semibold">{n.title}</span>
                        {n.detail && (
                          <span className="block truncate text-[0.8125rem] text-label-2">{n.detail}</span>
                        )}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </li>
              )
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
