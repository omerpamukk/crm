import { CalendarDays } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import type { Appointment } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import { NewAppointmentButton } from "./new-appointment-button";
import { AppointmentRowActions } from "./appointment-row-actions";

type AppointmentRow = Appointment & {
  customer: { full_name: string } | null;
  service: { name: string } | null;
  staff: { full_name: string | null } | null;
};

type BucketKey = "today" | "tomorrow" | "week" | "later" | "past";

export default async function RandevularPage() {
  const supabase = await createClient();

  const [appointmentsRes, customersRes, servicesRes, staffRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "*, customer:customers(full_name), service:services(name), staff:profiles(full_name)"
        )
        .order("starts_at", { ascending: true }),
      supabase.from("customers").select("id, full_name").order("full_name"),
      supabase.from("services").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const appointments = (appointmentsRes.data ??
    []) as unknown as AppointmentRow[];
  const customers = customersRes.data ?? [];
  const services = servicesRes.data ?? [];
  const staff = staffRes.data ?? [];

  // Gün gruplama sınırları
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
  buckets.past.reverse(); // geçmiş: en yeni üstte

  const groups: { key: BucketKey; label: string }[] = [
    { key: "today", label: "Bugün" },
    { key: "tomorrow", label: "Yarın" },
    { key: "week", label: "Bu Hafta" },
    { key: "later", label: "Daha Sonra" },
    { key: "past", label: "Geçmiş" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Randevular"
        description="Yaklaşan ve geçmiş randevularını gün gün takip et."
      >
        <NewAppointmentButton
          customers={customers}
          services={services}
          staff={staff}
        />
      </PageHeader>

      {customers.length === 0 && (
        <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
          Randevu oluşturabilmek için önce en az bir müşteri eklemelisiniz.
        </p>
      )}

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Henüz randevu yok"
          description="İlk randevunu oluştur; bugünden başlayarak gün gün burada listelenecek."
          action={
            customers.length > 0 ? (
              <NewAppointmentButton
                customers={customers}
                services={services}
                staff={staff}
              />
            ) : undefined
          }
        />
      ) : (
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
                            {a.staff?.full_name ? ` · ${a.staff.full_name}` : ""}
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
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
