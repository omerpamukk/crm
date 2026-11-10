import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import { safeTimeZone } from "@/lib/zaman";
import type { Appointment, UserRole } from "@/types/database";

import { addDays, zonedToUtc } from "./zaman";

/*
 * Takvim verisi (yalnızca sunucu): sayfa ilk aralığı, /takvim/aralik
 * gezinmede sonraki aralıkları buradan çeker. Her sorgu business_id ile
 * sınırlıdır; RLS ikinci savunma hattıdır.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Takvimde gösterilen randevu: düz alanlar + ad ve süre. */
export type CalAppt = Appointment & {
  customer_name: string;
  service_name: string | null;
  staff_name: string | null;
  /** Dakika (hizmet süresi; yoksa 30 — veritabanındaki çakışma kuralıyla aynı). */
  duration: number;
};

export type CalTimeOff = {
  id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type RangePayload = {
  /** Dahil, işletme saatine göre gün anahtarı. */
  start: string;
  end: string;
  appts: CalAppt[];
  timeOff: CalTimeOff[];
};

export type CalendarContext = {
  businessId: string;
  role: UserRole;
  tz: string;
  workingHours: unknown;
  /** Kullanıcının bağlı olduğu personel kaydı (uzman). */
  profileStaffId: string | null;
  /** Tüm randevuları göremeyen rol için yalnızca bu personelin randevuları. */
  onlyStaffId: string | null;
};

/** Hiçbir kayıtla eşleşmeyen kimlik (bağlı personeli olmayan uzman için). */
const NO_MATCH = "00000000-0000-0000-0000-000000000000";

/**
 * Oturum, rol, saat dilimi ve görünürlük kuralı. Uzman ("tum_randevular"
 * yetkisi yok) yalnızca kendi randevularını görür — Randevular sayfasıyla
 * aynı kural.
 */
export async function loadCalendarContext(supabase: Supabase): Promise<CalendarContext> {
  const ctx = await getAccountContext();
  const [bizRes, profileRes] = await Promise.all([
    supabase
      .from("businesses")
      .select("timezone, working_hours")
      .eq("id", ctx.businessId)
      .maybeSingle(),
    supabase.from("profiles").select("staff_id").eq("id", ctx.userId).maybeSingle(),
  ]);
  const biz = bizRes.data as { timezone: string | null; working_hours: unknown } | null;
  const profileStaffId = (profileRes.data as { staff_id: string | null } | null)?.staff_id ?? null;
  const onlyOwn = !can(ctx.role, "tum_randevular");
  return {
    businessId: ctx.businessId,
    role: ctx.role,
    tz: safeTimeZone(biz?.timezone),
    workingHours: biz?.working_hours ?? null,
    profileStaffId,
    onlyStaffId: onlyOwn ? (profileStaffId ?? NO_MATCH) : null,
  };
}

type ApptRow = Appointment & {
  customer: { full_name: string } | null;
  service: { name: string; duration_min: number | null } | null;
  staff_member: { full_name: string } | null;
};

const PAGE = 1000;

/** Aralıktaki randevular ve izinler. Hata olursa fırlatır (çağıran yakalar). */
export async function fetchRange(
  supabase: Supabase,
  ctx: Pick<CalendarContext, "businessId" | "tz" | "onlyStaffId">,
  start: string,
  end: string
): Promise<RangePayload> {
  const from = new Date(zonedToUtc(start, 0, ctx.tz)).toISOString();
  const to = new Date(zonedToUtc(addDays(end, 1), 0, ctx.tz)).toISOString();

  // Supabase tek seferde en çok 1000 satır döndürür; yoğun bir ayda sayfala.
  const rows: ApptRow[] = [];
  for (let offset = 0; offset < 20 * PAGE; offset += PAGE) {
    let q = supabase
      .from("appointments")
      .select(
        "*, customer:customers(full_name), service:services(name, duration_min), staff_member:staff(full_name)"
      )
      .eq("business_id", ctx.businessId)
      .gte("starts_at", from)
      .lt("starts_at", to);
    if (ctx.onlyStaffId) q = q.eq("staff_member_id", ctx.onlyStaffId);
    const { data, error } = await q
      .order("starts_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`appointments: ${error.message}`);
    const page = (data ?? []) as unknown as ApptRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  let offQuery = supabase
    .from("staff_time_off")
    .select("id, staff_id, starts_at, ends_at, reason")
    .eq("business_id", ctx.businessId)
    .lt("starts_at", to)
    .gt("ends_at", from);
  if (ctx.onlyStaffId) offQuery = offQuery.eq("staff_id", ctx.onlyStaffId);
  const offRes = await offQuery;
  // İzin tablosu kurulmamışsa (0020 çalışmadıysa) takvim izinsiz çalışır.
  const timeOff = offRes.error ? [] : ((offRes.data ?? []) as CalTimeOff[]);

  const appts: CalAppt[] = rows.map(({ customer, service, staff_member, ...a }) => ({
    ...a,
    customer_name: customer?.full_name ?? "İsimsiz müşteri",
    service_name: service?.name ?? null,
    staff_name: staff_member?.full_name ?? null,
    duration: service?.duration_min && service.duration_min > 0 ? service.duration_min : 30,
  }));

  return { start, end, appts, timeOff };
}
