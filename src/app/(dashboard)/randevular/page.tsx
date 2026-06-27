import Link from "next/link";
import { CalendarDays, List, LayoutList, Globe, Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/format";
import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NewAppointmentButton } from "./new-appointment-button";
import { AppointmentRowActions } from "./appointment-row-actions";
import { AppointmentReminder } from "./appointment-reminder";

const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** Bucket'a göre tarih/saat metni: bugün/yarın → saat; diğer → "12 May · 14:30". */
function whenText(iso: string, bucket: BucketKey): string {
  if (bucket === "today" || bucket === "tomorrow") return formatTime(iso);
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} · ${formatTime(iso)}`;
}

type AppointmentRow = Appointment & {
  customer: { full_name: string; phone: string | null } | null;
  service: { name: string; duration_min: number | null } | null;
  staff_member: { full_name: string } | null;
};

const AVATAR_TONES = [
  "bg-primary/10 text-primary",
  "bg-positive/10 text-positive",
  "bg-amber-500/10 text-amber-600",
  "bg-sky-500/10 text-sky-600",
  "bg-rose-500/10 text-rose-600",
  "bg-violet-500/10 text-violet-600",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()) || "?";
}

function toneFor(name: string): string {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

type BucketKey = "today" | "tomorrow" | "week" | "later" | "past";

/** Online randevu linkinden gelen randevular için küçük rozet. */
function OnlineBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      <Globe className="size-2.5" />
      Online
    </span>
  );
}

export default async function RandevularPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isTable = view === "table";
  const supabase = await createClient();

  const [appointmentsRes, customersRes, servicesRes, staffRes, packagesRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "*, customer:customers(full_name, phone), service:services(name, duration_min), staff_member:staff(full_name)"
        )
        .order("starts_at", { ascending: true }),
      supabase.from("customers").select("id, full_name").order("full_name"),
      supabase.from("services").select("id, name, price").order("name"),
      supabase
        .from("staff")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("packages")
        .select("id, customer_id, service_name, remaining_sessions"),
    ]);

  const appointments = (appointmentsRes.data ??
    []) as unknown as AppointmentRow[];
  const customers = customersRes.data ?? [];
  const services = servicesRes.data ?? [];
  const staff = staffRes.data ?? [];
  const packages = packagesRes.data ?? [];

  // Gün gruplama sınırları (Liste görünümü için)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startOfToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const startDayAfter = new Date(startOfToday);
  startDayAfter.setDate(startDayAfter.getDate() + 2);
  const startNextWeek = new Date(startOfToday);
  startNextWeek.setDate(startNextWeek.getDate() + 7);

  function bucketOf(a: AppointmentRow): BucketKey {
    const t = new Date(a.starts_at).getTime();
    if (t < startOfToday.getTime()) return "past";
    if (t < startTomorrow.getTime()) return "today";
    if (t < startDayAfter.getTime()) return "tomorrow";
    if (t < startNextWeek.getTime()) return "week";
    return "later";
  }

  const buckets: Record<BucketKey, AppointmentRow[]> = {
    today: [],
    tomorrow: [],
    week: [],
    later: [],
    past: [],
  };
  for (const a of appointments) buckets[bucketOf(a)].push(a);
  buckets.past.reverse();

  const groups: { key: BucketKey; label: string; accent: string }[] = [
    { key: "today", label: "Bugün", accent: "text-primary" },
    { key: "tomorrow", label: "Yarın", accent: "text-sky-600" },
    { key: "week", label: "Bu Hafta", accent: "text-amber-600" },
    { key: "later", label: "Daha Sonra", accent: "text-muted-foreground" },
    { key: "past", label: "Geçmiş", accent: "text-muted-foreground" },
  ];

  const upcomingCount = buckets.today.length + buckets.tomorrow.length + buckets.week.length;

  // Tablo görünümü en yeni üstte
  const tableRows = [...appointments].reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Randevular"
        description="Randevularını gün gün takip et, WhatsApp'tan hatırlat ya da tablo halinde gör."
      >
        <NewAppointmentButton
          customers={customers}
          services={services}
          staff={staff}
          packages={packages}
        />
      </PageHeader>

      {customers.length === 0 && appointments.length === 0 && (
        <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
          Randevu oluşturabilmek için önce en az bir müşteri eklemelisiniz.
        </p>
      )}

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Henüz randevu yok"
          description="İlk randevunu oluştur; tablo ve gün gün listede burada görünecek."
          action={
            customers.length > 0 ? (
              <NewAppointmentButton
                customers={customers}
                services={services}
                staff={staff}
                packages={packages}
              />
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Özet + görünüm geçişi */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Yaklaşan <span className="font-semibold text-foreground">{upcomingCount}</span> randevu
              {" · "}toplam <span className="font-semibold text-foreground">{appointments.length}</span>
            </p>
            <div className="flex items-center rounded-lg border p-0.5 w-fit">
              <Link
                href="/randevular"
                className={cn(
                  buttonVariants({ variant: isTable ? "ghost" : "secondary", size: "sm" }),
                  "gap-1.5"
                )}
              >
                <List className="size-4" />
                Gün Gün
              </Link>
              <Link
                href="/randevular?view=table"
                className={cn(
                  buttonVariants({ variant: isTable ? "secondary" : "ghost", size: "sm" }),
                  "gap-1.5"
                )}
              >
                <LayoutList className="size-4" />
                Tablo
              </Link>
            </div>
          </div>

          {!isTable ? (
            <div className="space-y-5">
              {groups.map((group) => {
                const items = buckets[group.key];
                if (items.length === 0) return null;
                const GroupIcon = group.key === "today" ? Clock : CalendarDays;
                return (
                  <section
                    key={group.key}
                    className="overflow-hidden rounded-xl border bg-card shadow-xs"
                  >
                    <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <GroupIcon className={cn("size-4", group.accent)} />
                        {group.label}
                      </h2>
                      <Badge variant="secondary">{items.length} randevu</Badge>
                    </header>
                    <ul className="divide-y">
                      {items.map((a) => {
                        const name = a.customer?.full_name ?? "—";
                        return (
                          <li
                            key={a.id}
                            className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4"
                          >
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                toneFor(name)
                              )}
                            >
                              {initials(name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5 truncate text-sm font-medium leading-tight">
                                {a.customer_id ? (
                                  <Link href={`/musteriler/${a.customer_id}`} className="hover:text-primary hover:underline">{name}</Link>
                                ) : (
                                  name
                                )}
                                {a.booked_online && <OnlineBadge />}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/80">
                                  {whenText(a.starts_at, group.key)}
                                </span>
                                {a.service?.name ? ` · ${a.service.name}` : ""}
                                {a.service?.duration_min ? ` · ${a.service.duration_min} dk` : ""}
                                {a.staff_member?.full_name ? ` · ${a.staff_member.full_name}` : ""}
                              </p>
                            </div>
                            <Badge
                              variant={appointmentStatusVariant(a.status)}
                              className="hidden shrink-0 sm:inline-flex"
                            >
                              {appointmentStatusLabel(a.status)}
                            </Badge>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <span className="hidden sm:inline-flex">
                                <AppointmentReminder
                                  phone={a.customer?.phone ?? null}
                                  customerName={name}
                                  startsAt={a.starts_at}
                                  serviceName={a.service?.name ?? null}
                                />
                              </span>
                              <AppointmentRowActions
                                appointment={a}
                                customers={customers}
                                services={services}
                                staff={staff}
                                packages={packages}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Tarih / Saat</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Hizmet</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Personel</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {formatDateTime(a.starts_at)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          {a.customer_id ? (
                            <Link href={`/musteriler/${a.customer_id}`} className="hover:text-primary hover:underline">{a.customer?.full_name ?? "—"}</Link>
                          ) : (
                            (a.customer?.full_name ?? "—")
                          )}
                          {a.booked_online && <OnlineBadge />}
                        </span>
                      </TableCell>
                      <TableCell>{a.service?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {a.service?.duration_min ? `${a.service.duration_min} dk` : "—"}
                      </TableCell>
                      <TableCell>{a.staff_member?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={appointmentStatusVariant(a.status)}>
                          {appointmentStatusLabel(a.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AppointmentRowActions
                          appointment={a}
                          customers={customers}
                          services={services}
                          staff={staff}
                          packages={packages}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
