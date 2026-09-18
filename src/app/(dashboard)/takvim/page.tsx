import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarRange, Clock, CalendarPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/format";
import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

type CalAppointment = Appointment & {
  customer: { full_name: string } | null;
  service: { name: string; duration_min: number | null } | null;
};

// Durum → sol kenarlık rengi (Bugünün Programı paneli)
const STATUS_BORDER: Record<string, string> = {
  completed: "border-l-positive",
  cancelled: "border-l-danger",
  no_show: "border-l-muted-foreground/40",
  planned: "border-l-primary",
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

  // Bugünün programı her zaman GERÇEK bugüne ait (hangi ay görüntülenirse görüntülensin)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const supabase = await createClient();
  const [gridRes, todayRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, customer:customers(full_name), service:services(name, duration_min)")
      .gte("starts_at", gridStart.toISOString())
      .lt("starts_at", gridEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("*, customer:customers(full_name), service:services(name, duration_min)")
      .gte("starts_at", startOfToday.toISOString())
      .lt("starts_at", endOfToday.toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  const appointments = (gridRes.data ?? []) as unknown as CalAppointment[];
  const todayAppointments = (todayRes.data ?? []) as unknown as CalAppointment[];

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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Sol kolon: aylık takvim */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarRange className="size-5 text-primary" />
              {MONTH_NAMES[month]} {year}
            </h2>
            <span className="text-sm text-muted-foreground">
              {monthTotal} randevu
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
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
                      "min-h-24 border-b border-r p-1.5 transition-colors last:border-r-0 [&:nth-child(7n)]:border-r-0",
                      i >= 35 && "border-b-0",
                      !inMonth ? "bg-muted/20" : "hover:bg-muted/30",
                      isToday && "bg-primary/[0.04]"
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

        {/* Sağ kolon: Bugünün Programı (her zaman gerçek bugüne ait) */}
        <aside className="overflow-hidden rounded-lg border bg-card shadow-soft lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-primary" />
              Bugünün Programı
            </h3>
            <span className="text-xs text-muted-foreground">
              {now.getDate()} {MONTH_NAMES[now.getMonth()]}
            </span>
          </div>

          <div className="p-3">
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarPlus className="size-7 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Bugün için planlanmış randevu yok.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {todayAppointments.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-lg border border-l-4 bg-card p-2.5 shadow-soft",
                      STATUS_BORDER[a.status ?? "planned"] ?? "border-l-primary"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="tabular-nums text-sm font-semibold text-primary">
                        {formatTime(a.starts_at)}
                      </span>
                      <Badge variant={appointmentStatusVariant(a.status)}>
                        {appointmentStatusLabel(a.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium leading-tight">
                      {a.customer?.full_name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.service?.name ?? "Hizmet belirtilmedi"}
                      {a.service?.duration_min ? ` · ${a.service.duration_min} dk` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
