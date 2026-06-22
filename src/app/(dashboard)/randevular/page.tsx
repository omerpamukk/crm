import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { appointmentStatusLabel } from "@/lib/constants";
import type { Appointment } from "@/types/database";
import { Badge } from "@/components/ui/badge";
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
  staff: { full_name: string | null } | null;
};

export default async function RandevularPage() {
  const supabase = await createClient();

  const [appointmentsRes, customersRes, servicesRes, staffRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "*, customer:customers(full_name), service:services(name), staff:profiles(full_name)"
        )
        .order("starts_at", { ascending: false }),
      supabase.from("customers").select("id, full_name").order("full_name"),
      supabase.from("services").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const appointments = (appointmentsRes.data ??
    []) as unknown as AppointmentRow[];
  const customers = customersRes.data ?? [];
  const services = servicesRes.data ?? [];
  const staff = staffRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Randevular</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {appointments.length} kayıt
          </p>
        </div>
        <NewAppointmentButton
          customers={customers}
          services={services}
          staff={staff}
        />
      </div>

      {customers.length === 0 && (
        <p className="rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
          Randevu oluşturabilmek için önce en az bir müşteri eklemelisiniz.
        </p>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih / Saat</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Hizmet</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Henüz randevu yok. “Yeni randevu” ile ekleyin.
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {formatDateTime(a.starts_at)}
                  </TableCell>
                  <TableCell>{a.customer?.full_name ?? "—"}</TableCell>
                  <TableCell>{a.service?.name ?? "—"}</TableCell>
                  <TableCell>{a.staff?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {appointmentStatusLabel(a.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AppointmentRowActions
                      appointment={a}
                      customers={customers}
                      services={services}
                      staff={staff}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
