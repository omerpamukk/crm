import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types/database";
import { requireCapability } from "@/lib/supabase/guard";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { trMidnight, trParts } from "../panel/dates";

import { ensureBookingSettings } from "./booking-actions";
import { BookingLinkView, type BookingStats } from "./booking-link-view";

export const metadata = { title: "Randevu Linki" };

export const dynamic = "force-dynamic";

export default async function RandevuLinkiPage() {
  await requireCapability("randevu_yonet");
  const { settings, error } = await ensureBookingSettings();

  if (error || !settings) {
    return (
      <div className="space-y-8">
        <PageHeader title="Randevu Linki" />
        <ErrorState
          title="Randevu Linki yüklenemedi"
          description={error ?? "Link ayarları açılamadı. Sayfayı yenileyip tekrar deneyin."}
          action={
            <Button asChild variant="secondary">
              <a href="/randevu-linki">Tekrar dene</a>
            </Button>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { y, m } = trParts(new Date());
  const startOfMonth = trMidnight(y, m, 1);

  const [servicesRes, onlineRes] = await Promise.all([
    supabase.from("services").select("*").order("name"),
    supabase
      .from("appointments")
      .select("status")
      .eq("booked_online", true)
      .gte("starts_at", startOfMonth.toISOString()),
  ]);

  const loadFailed = Boolean(servicesRes.error || onlineRes.error);
  if (loadFailed) console.error("randevu-linki:", servicesRes.error ?? onlineRes.error);

  const services = (servicesRes.data ?? []) as Service[];
  const online = (onlineRes.data ?? []) as { status: string | null }[];

  const total = online.length;
  // Onaylanan: bekleyen, gelen (geldi) ve tamamlanan randevular
  const approved = online.filter(
    (a) => !a.status || a.status === "planned" || a.status === "arrived" || a.status === "completed"
  ).length;
  const cancelled = online.filter((a) => a.status === "cancelled").length;
  const stats: BookingStats = {
    total,
    approved,
    cancelled,
    rate: total > 0 ? Math.round((approved / total) * 100) : 0,
  };

  return (
    <BookingLinkView settings={settings} services={services} stats={stats} loadFailed={loadFailed} />
  );
}
