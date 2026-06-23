import Link from "next/link";
import { CalendarDays, List, LayoutList } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
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

type AppointmentRow = Appointment & {
  customer: { full_name: string } | null;
  service: { name: string } | null;
  staff_member: { full_name: string } | null;
};

type BucketKey = "today" | "tomorrow" | "week" | "later" | "past";

export default async function RandevularPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isList = view === "list";
  const supabase = await createClient();

  const [appointmentsRes, customersRes, servicesRes, staffRes, packagesRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "*, customer:customers(full_name), service:services(name), staff_member:staff(full_name)"
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

  const groups: { key: BucketKey; label: string }[] = [
    { key: "today", label: "Bugün" },
    { key: "tomorrow", label: "Yarın" },
    { key: "week", label: "Bu Hafta" },
    { key: "later", label: "Daha Sonra" },
    { key: "past", label: "Geçmiş" },
  ];

  // Tablo görünümü en yeni üstte
  const tableRows = [...appointments].reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Randevular"
        description="Tüm randevularını tablo halinde gör ya da gün gün takip et."
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
          {/* Görünüm geçişi: Tablo / Liste */}
          <div className="flex items-center rounded-lg border p-0.5 w-fit">
            <Link
              href="/randevular"
              className={cn(
                buttonVariants({
                  variant: isList ? "ghost" : "secondary",
                  size: "sm",
                }),
                "gap-1.5"
              )}
            >
              <LayoutList className="size-4" />
              Tablo
            </Link>
            <Link
              href="/randevular?view=list"
              className={cn(
                buttonVariants({
                  variant: isList ? "secondary" : "ghost",
                  size: "sm",
                }),
                "gap-1.5"
              )}
            >
              <List className="size-4" />
              Liste
            </Link>
          </div>

          {isList ? (
            <div className="space-y-6">
              {groups.map((group) => {
                const items = buckets[group.key];
                if (items.length === 0) return null;
                return (
                  <section key={group.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-muted-foreground">
                        {group.label}
                      </h2>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex flex-col items-center justify-center rounded-md bg-primary/10 px-3 py-1.5 text-primary">
                              <CalendarDays className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium leading-tight">
                                {a.customer?.full_name ?? "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {formatDateTime(a.starts_at)}
                                {a.service?.name ? ` · ${a.service.name}` : ""}
                                {a.staff_member?.full_name
                                  ? ` · ${a.staff_member.full_name}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant={appointmentStatusVariant(a.status)}>
                              {appointmentStatusLabel(a.status)}
                            </Badge>
                            <AppointmentRowActions
                              appointment={a}
                              customers={customers}
                              services={services}
                              staff={staff}
                              packages={packages}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
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
                      <TableCell>{a.customer?.full_name ?? "—"}</TableCell>
                      <TableCell>{a.service?.name ?? "—"}</TableCell>
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
