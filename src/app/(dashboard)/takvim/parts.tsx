"use client";

import { useSyncExternalStore } from "react";
import { Clock, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { initials } from "@/components/ui/avatar";
import { appointmentDotClass, appointmentTone, type AppointmentTone } from "@/components/shared/appointment-block";
import { StatusBadge, StatusIcons } from "@/components/shared/status";

import type { CalAppt } from "./queries";
import { dayKeyOf, hhmm, minuteOfDay } from "./zaman";

/** Takvimde konumlanmış randevu: gün ve dakika işletme saatine göre. */
export type Placed = CalAppt & { dayKey: string; startMin: number; endMin: number };

export function place(a: CalAppt, tz: string): Placed {
  const startMin = minuteOfDay(a.starts_at, tz);
  return {
    ...a,
    dayKey: dayKeyOf(a.starts_at, tz),
    startMin,
    endMin: Math.min(24 * 60, startMin + a.duration),
  };
}

export const STATUS_LABEL: Record<AppointmentTone, string> = {
  planned: "Planlandı",
  arrived: "Geldi",
  completed: "Tamamlandı",
  no_show: "Gelmedi",
  cancelled: "İptal edildi",
};

/** "10:30–11:30" */
export function timeSpan(a: Placed): string {
  return `${hhmm(a.startMin)}–${hhmm(a.endMin)}`;
}

/** Personelin baş harfleri ("Merve Kaya" → "MK"); atanmamışsa null. */
export function staffInitials(a: Pick<CalAppt, "staff_name">): string | null {
  return a.staff_name ? initials(a.staff_name) : null;
}

/** Ekran okuyucu için blok adı. */
export function blockLabel(a: Placed): string {
  return [
    timeSpan(a),
    a.customer_name,
    a.service_name,
    a.staff_name,
    STATUS_LABEL[appointmentTone(a.status)],
  ]
    .filter(Boolean)
    .join(", ");
}

/** Durum metni: "Geldi · 14:32" gibi. */
export function StatusText({ a, tz }: { a: CalAppt; tz: string }) {
  const tone = appointmentTone(a.status);
  if (tone === "arrived") {
    return (
      <StatusBadge variant="positive">
        Geldi{a.arrived_at ? ` · ${hhmm(minuteOfDay(a.arrived_at, tz))}` : ""}
      </StatusBadge>
    );
  }
  if (tone === "completed") return <StatusBadge variant="secondary" icon={StatusIcons.done}>Tamamlandı</StatusBadge>;
  if (tone === "no_show") return <StatusBadge variant="danger">Gelmedi</StatusBadge>;
  if (tone === "cancelled") return <StatusBadge variant="secondary" icon={StatusIcons.cancelled}>İptal edildi</StatusBadge>;
  return <StatusBadge variant="neutral" icon={Clock}>Planlandı</StatusBadge>;
}

/** Durum özeti: "12 randevu · 3 geldi · 1 gelmedi". */
export function summaryText(list: readonly CalAppt[]): string {
  const c: Record<AppointmentTone, number> = { planned: 0, arrived: 0, completed: 0, no_show: 0, cancelled: 0 };
  for (const a of list) c[appointmentTone(a.status)]++;
  return [
    `${list.length} randevu`,
    c.arrived ? `${c.arrived} geldi` : "",
    c.completed ? `${c.completed} tamamlandı` : "",
    c.no_show ? `${c.no_show} gelmedi` : "",
    c.cancelled ? `${c.cancelled} iptal` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ---------------- Şu an (dakikada bir) ---------------- */

function subscribeMinute(cb: () => void) {
  const id = window.setInterval(cb, 20_000);
  return () => window.clearInterval(id);
}
const minuteSnapshot = () => Math.floor(Date.now() / 60_000);
const serverSnapshot = () => null;

/**
 * Şimdiki dakika (ms). Sunucuda ve hydration sırasında null: "şu an" çizgisi
 * yalnızca istemcide çizilir, sunucu çıktısıyla çakışmaz.
 */
export function useNowMinute(): number | null {
  const m = useSyncExternalStore(subscribeMinute, minuteSnapshot, serverSnapshot);
  return m === null ? null : m * 60_000;
}

/* ---------------- Küçük parçalar ---------------- */

/** Durum renklerinin açıklaması (renk tek başına anlam taşımasın). */
export function Legend({ className }: { className?: string }) {
  const tones: AppointmentTone[] = ["planned", "arrived", "completed", "no_show", "cancelled"];
  return (
    <ul
      aria-label="Renklerin anlamı"
      className={cn(
        // Dar ekranda alt satıra geçer (her etiket kendi satırında bütün kalır)
        "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] whitespace-nowrap text-label-2",
        className
      )}
    >
      {tones.map((t) => (
        <li key={t} className="flex shrink-0 items-center gap-1.5">
          <span aria-hidden className={cn("size-2 rounded-full", appointmentDotClass(t))} />
          {STATUS_LABEL[t]}
        </li>
      ))}
    </ul>
  );
}

/**
 * Boş aralık mesajı — ızgaranın üstünde yüzer, ızgara görünür kalır.
 * Çıkmaz yok: ne yapılacağını söyler, düğmesini sunar.
 */
export function EmptyOverlay({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-3 z-30 flex justify-center", className)}>
      <div
        role="status"
        className="pointer-events-auto flex max-w-[22rem] flex-col items-center rounded-2xl bg-surface px-6 py-5 text-center"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <Icon aria-hidden className="size-8 text-label-3" strokeWidth={1.5} />
        <p className="mt-2 text-headline">{title}</p>
        {description && <p className="mt-1 text-[0.875rem] text-label-2">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
