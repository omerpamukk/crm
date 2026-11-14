import Link from "next/link";
import { Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { computeOccupancy, WEEKDAY_LONG, type WorkingDay } from "@/lib/occupancy";
import { safeTimeZone } from "@/lib/zaman";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { PageHeader } from "@/components/shared/page-header";

import { parseDateKey } from "../randevular/date-range";
import { PeriodControl } from "../raporlar/period-control";
import { resolvePeriod } from "../raporlar/period";
import { ReportSection } from "../raporlar/report-section";
import { OccupancyHeatmap } from "./heatmap";

export const metadata = { title: "Doluluk" };

const KINDS = ["hafta", "ay", "ozel"] as const;
const NUM = new Intl.NumberFormat("tr-TR");

function readWorkingDays(raw: unknown): WorkingDay[] | null {
  const days = (raw as { days?: unknown } | null)?.days;
  if (!Array.isArray(days) || days.length !== 7) return null;
  const ok = days.every(
    (d) =>
      d &&
      typeof d === "object" &&
      typeof (d as WorkingDay).day === "number" &&
      typeof (d as WorkingDay).open === "boolean" &&
      typeof (d as WorkingDay).start === "string" &&
      typeof (d as WorkingDay).end === "string"
  );
  return ok ? (days as WorkingDay[]) : null;
}

const hoursLabel = (min: number) => `${NUM.format(Math.round(min / 60))} saat`;

/**
 * Doluluk: çalışma saatlerinin ne kadarı randevuyla dolu. Gün × saat
 * tablosu boş saatleri gösterir; en boş dilimler kampanya fikri verir.
 */
export default async function DolulukPage({
  searchParams,
}: {
  searchParams: Promise<{ aralik?: string; tarih?: string; bas?: string; bit?: string }>;
}) {
  await requireCapability("raporlar");

  const now = new Date();
  const period = resolvePeriod(await searchParams, "ay", KINDS, now);

  const header = (
    <PageHeader
      title="Doluluk"
      description="Çalışma saatlerinizin ne kadarı randevuyla dolu, hangi saatler boş kalıyor."
      context={<PeriodControl kinds={KINDS} defaultKind="ay" todayMs={now.getTime()} />}
    />
  );

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState />
      </div>
    );
  }

  const startAt = (parseDateKey(period.startKey) as Date).toISOString();
  const endAt = (parseDateKey(period.endKey) as Date).toISOString();

  const [bizRes, staffRes, apptRes] = await Promise.all([
    supabase.from("businesses").select("timezone, working_hours").eq("id", businessId).maybeSingle(),
    supabase.from("staff").select("id, full_name").eq("business_id", businessId).eq("is_active", true).order("full_name"),
    supabase
      .from("appointments")
      .select("starts_at, status, staff_member_id, service:services(duration_min)")
      .eq("business_id", businessId)
      .gte("starts_at", startAt)
      .lt("starts_at", endAt)
      .limit(20000),
  ]);

  if (bizRes.error || staffRes.error || apptRes.error) {
    console.error("doluluk:", bizRes.error ?? staffRes.error ?? apptRes.error);
    return (
      <div className="space-y-8">
        {header}
        <ErrorState title="Doluluk yüklenemedi" />
      </div>
    );
  }

  const biz = bizRes.data as { timezone: string | null; working_hours: unknown } | null;
  const workingDays = readWorkingDays(biz?.working_hours);
  if (!workingDays || !workingDays.some((d) => d.open)) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon={Clock}
          title="Önce çalışma saatlerini girin"
          description="Doluluk, açık olduğunuz saatlere göre hesaplanır. Hangi gün kaçta açıp kapattığınızı Ayarlar'a girin."
          action={
            <Link href="/ayarlar?bolum=saatler" className={cn(buttonVariants())}>
              Çalışma saatleri
            </Link>
          }
        />
      </div>
    );
  }

  type Row = { starts_at: string; status: string | null; staff_member_id: string | null; service: { duration_min: number | null } | { duration_min: number | null }[] | null };
  const appts = ((apptRes.data ?? []) as Row[]).map((a) => {
    const svc = Array.isArray(a.service) ? a.service[0] : a.service;
    return { starts_at: a.starts_at, status: a.status, staff: a.staff_member_id, duration_min: svc?.duration_min ?? null };
  });
  const staff = (staffRes.data ?? []) as { id: string; full_name: string }[];
  const tz = safeTimeZone(biz?.timezone);
  const base = { workingDays, startKey: period.startKey, endKey: period.endKey, tz };

  const all = computeOccupancy({ ...base, staffCount: staff.length, appointments: appts });
  const perStaff = staff
    .map((s) => ({
      ...s,
      occ: computeOccupancy({ ...base, staffCount: 1, appointments: appts.filter((a) => a.staff === s.id) }),
    }))
    .sort((a, b) => (b.occ.pct ?? 0) - (a.occ.pct ?? 0));
  const freeMin = Math.max(0, all.capacityMin - all.bookedMin);

  return (
    <div className="space-y-8">
      {header}

      <MetricStrip aria-label="Doluluk özeti">
        <Metric label="Doluluk" value={all.pct == null ? "—" : `%${all.pct}`} />
        <Metric label="Dolu süre" value={hoursLabel(all.bookedMin)} />
        <Metric label="Boş kalan" value={hoursLabel(freeMin)} context={`${NUM.format(Math.max(staff.length, 1))} personel`} />
      </MetricStrip>

      <ReportSection title="Gün ve saate göre" detail="Hücredeki sayı doluluk yüzdesi">
        <OccupancyHeatmap hours={all.hours} cells={all.cells} />
      </ReportSection>

      <div className="grid items-start gap-x-5 gap-y-8 lg:grid-cols-2">
        <ListGroup title="En boş saatler" detail="Kampanya için iyi zaman">
          {all.quietest.map((c) => (
            <ListRow
              key={`${c.day}-${c.hour}`}
              title={`${WEEKDAY_LONG[c.day]} ${String(c.hour).padStart(2, "0")}:00–${String(c.hour + 1).padStart(2, "0")}:00`}
              trailing={<span className="tabular-nums text-label-2">%{c.pct ?? 0} dolu</span>}
            />
          ))}
        </ListGroup>

        {perStaff.length > 0 && (
          <ListGroup title="Personel" detail="Kendi saatlerinin ne kadarı dolu" inset={60}>
            {perStaff.map((s) => (
              <ListRow
                key={s.id}
                leading={<Avatar name={s.full_name} size="sm" />}
                title={s.full_name}
                subtitle={hoursLabel(s.occ.bookedMin)}
                trailing={<span className="tabular-nums text-label">{s.occ.pct == null ? "—" : `%${s.occ.pct}`}</span>}
              />
            ))}
          </ListGroup>
        )}
      </div>

      <p className="mx-1 text-footnote text-label-2">
        Çalışma saatleri × aktif personel üzerinden hesaplanır. İptal edilen randevular sayılmaz; süresi olmayan hizmet 30 dakika kabul edilir.
      </p>
    </div>
  );
}
