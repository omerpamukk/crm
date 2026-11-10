import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";

import { fetchRange, loadCalendarContext } from "./queries";
import { TakvimView, type CalShift, type CalStaff, type FormOptions, type WorkingDay } from "./takvim-view";
import { isDayKey, isGorunum, todayKeyIn, visibleRange } from "./zaman";

export const metadata = { title: "Takvim" };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** businesses.working_hours → 7 gün; yoksa ya da bozuksa null (mesai bilgisi yok). */
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

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const ctx = await loadCalendarContext(supabase);

  const todayKey = todayKeyIn(ctx.tz);
  const rawView = first(sp.gorunum);
  const rawDate = first(sp.tarih);
  const view = isGorunum(rawView) ? rawView : "gun";
  const dateKey = isDayKey(rawDate) ? rawDate : todayKey;
  const range = visibleRange(view, dateKey);
  const canManage = can(ctx.role, "randevu_yonet");

  const [staffRes, shiftsRes, initial, options] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, title, is_active")
      .eq("business_id", ctx.businessId)
      .order("full_name"),
    // Vardiyalar (0020). Tablo yoksa ya da boşsa işletme çalışma saatleri kullanılır.
    supabase
      .from("staff_shifts")
      .select("staff_id, weekday, start_time, end_time, is_active")
      .eq("business_id", ctx.businessId),
    fetchRange(supabase, ctx, range.start, range.end).catch((err) => {
      console.error("takvim:", err);
      return null;
    }),
    canManage ? loadFormOptions(supabase, ctx.businessId) : Promise.resolve(null),
  ]);

  return (
    <TakvimView
      tz={ctx.tz}
      serverTodayKey={todayKey}
      staff={(staffRes.data ?? []) as CalStaff[]}
      shifts={shiftsRes.error ? [] : ((shiftsRes.data ?? []) as CalShift[])}
      workingDays={readWorkingDays(ctx.workingHours)}
      initial={initial}
      role={ctx.role}
      profileStaffId={ctx.profileStaffId}
      onlyOwn={ctx.onlyStaffId !== null}
      canManage={canManage}
      formOptions={options}
    />
  );
}

/** Randevu formunun seçenekleri (Randevular sayfasıyla aynı). */
async function loadFormOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string
): Promise<FormOptions> {
  const [customers, services, staff, packages] = await Promise.all([
    supabase.from("customers").select("id, full_name").eq("business_id", businessId).order("full_name"),
    supabase.from("services").select("id, name, price").eq("business_id", businessId).order("name"),
    supabase
      .from("staff")
      .select("id, full_name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("packages")
      .select("id, customer_id, service_name, remaining_sessions")
      .eq("business_id", businessId),
  ]);
  return {
    customers: customers.data ?? [],
    services: services.data ?? [],
    staff: staff.data ?? [],
    packages: packages.data ?? [],
  };
}
