import { CalendarPlus, CheckCircle2, XCircle, Percent } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ensureBookingSettings } from "./booking-actions";
import { BookingLinkView } from "./booking-link-view";

export const dynamic = "force-dynamic";

export default async function RandevuLinkiPage() {
  const { settings, error } = await ensureBookingSettings();

  if (error || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Randevu Linki" description="Online randevu linki yönetimi." />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {error ?? "Ayarlar yüklenemedi."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [servicesRes, onlineApptsRes] = await Promise.all([
    supabase.from("services").select("*").order("name"),
    supabase
      .from("appointments")
      .select("status")
      .eq("booked_online", true)
      .gte("starts_at", startOfMonth.toISOString()),
  ]);

  const services = (servicesRes.data ?? []) as Service[];
  const online = (onlineApptsRes.data ?? []) as { status: string | null }[];

  const total = online.length;
  const approved = online.filter(
    (a) => a.status === "completed" || a.status === "planned"
  ).length;
  const cancelled = online.filter((a) => a.status === "cancelled").length;
  const conversion = total > 0 ? Math.round((approved / total) * 100) : 0;

  const kpis = [
    {
      label: "Bu Ay Gelen",
      value: total.toLocaleString("tr-TR"),
      icon: CalendarPlus,
      tone: "bg-primary/10 text-primary",
      bar: "border-l-primary",
    },
    {
      label: "Onaylanan",
      value: approved.toLocaleString("tr-TR"),
      icon: CheckCircle2,
      tone: "bg-positive/10 text-positive",
      bar: "border-l-positive",
    },
    {
      label: "İptal",
      value: cancelled.toLocaleString("tr-TR"),
      icon: XCircle,
      tone: "bg-danger/10 text-danger",
      bar: "border-l-danger",
    },
    {
      label: "Dönüşüm",
      value: `%${conversion}`,
      icon: Percent,
      tone: "bg-warning/12 text-amber-600",
      bar: "border-l-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Randevu Linki"
        description="Müşterilerinin tek bir linkten kendi randevusunu almasını sağla. Linki paylaş, hizmetleri ve çalışma saatlerini buradan yönet."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`border-l-4 ${kpi.bar}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <span className={`flex size-9 items-center justify-center rounded-lg ${kpi.tone}`}>
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BookingLinkView settings={settings} services={services} />
    </div>
  );
}
