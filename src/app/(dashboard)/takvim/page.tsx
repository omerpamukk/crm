import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/format";
import { appointmentStatusLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/database";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

type CalAppointment = Appointment & {
  customer: { full_name: string } | null;
  service: { name: string } | null;
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

// Durum → takvim çipi rengi
const STATUS_CHIP: Record<string, string> = {
  completed: "bg-positive/12 text-positive",
  cancelled: "bg-danger/12 text-danger line-through",
  no_show: "bg-muted text-muted-foreground line-through",
  planned: "bg-primary/10 text-primary",
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function parseMonth(value: string | undefined, now: Date): { year: number; month: number } {
  if (value) {
    const [y, m] = value.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const { year, month } = parseMonth(monthParam, now);

  // Ay başı + Pazartesi'den başlayan 6 haftalık ızgara
  const monthStart = new Date(year, month, 1);
  const offset = (monthStart.getDay() + 6) % 7; // Pzt = 0
  const gridStart = new Date(year, month, 1 - offset);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 42);

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "*, customer:customers(full_name), service:services(name)"
    )
    .gte("starts_at", gridStart.toISOString())
    .lt("starts_at", gridEnd.toISOString())
    .order("starts_at", { ascending: true });

  const appointments = (data ?? []) as unknown as CalAppointment[];

  // Güne göre grupla
  const byDay = new Map<string, CalAppointment[]>();
  for (const a of appointments) {
    const key = dateKey(new Date(a.starts_at));
    const arr = byDay.get(key);
    if (arr) arr.push(a);
    else byDay.set(key, [a]);
  }

  // 42 hücre
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    cells.push(d);
  }

  const todayKey = dateKey(now);
  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const fmtMonthParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const monthTotal = appointments.filter(
    (a) => new Date(a.starts_at).getMonth() === month
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Takvim"
        description="Randevularını aylık takvim üzerinde gör."
      >
        <div className="flex items-center gap-1">
          <Link
            href={`/takvim?month=${fmtMonthParam(prevMonth)}`}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            aria-label="Önceki ay"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href="/takvim"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Bugün
          </Link>
          <Link
            href={`/takvim?month=${fmtMonthParam(nextMonth)}`}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            aria-label="Sonraki ay"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </PageHeader>

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarRange className="size-5 text-primary" />
          {MONTH_NAMES[month]} {year}
        </h2>
        <span className="text-sm text-muted-foreground">
          {monthTotal} randevu
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {/* Hafta günü başlıkları */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Gün hücreleri */}
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = dateKey(d);
            const inMonth = d.getMonth() === month;
            const isToday = key === todayKey;
            const items = byDay.get(key) ?? [];
            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                  i >= 35 && "border-b-0",
                  !inMonth && "bg-muted/20"
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      title={`${formatTime(a.starts_at)} · ${
                        a.customer?.full_name ?? "—"
                      }${a.service?.name ? ` · ${a.service.name}` : ""} · ${appointmentStatusLabel(
                        a.status
                      )}`}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[11px] leading-tight",
                        STATUS_CHIP[a.status ?? "planned"] ??
                          "bg-primary/10 text-primary"
                      )}
                    >
                      <span className="tabular-nums font-medium">
                        {formatTime(a.starts_at)}
                      </span>{" "}
                      {a.customer?.full_name ?? "—"}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="px-1 text-[11px] text-muted-foreground">
                      +{items.length - 3} daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Açıklama (legend) */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> Planlandı
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-positive" /> Tamamlandı
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-danger" /> İptal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" /> Gelmedi
        </span>
      </div>
    </div>
  );
}
