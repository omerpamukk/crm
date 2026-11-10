"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { getActingSession } from "@/lib/supabase/admin-context";
import { can } from "@/lib/permissions";
import { BUSINESS_TZ, fromDateTimeLocal, toDateTimeLocal } from "@/lib/zaman";
import { formatTime } from "@/lib/format";
import { logInteraction } from "@/lib/supabase/interactions";
import { canChangeArrival, canMarkArrived, canUndoArrived } from "@/lib/appointment-status";
import type { UserRole } from "@/types/database";
import { appointmentSchema, NONE, type AppointmentInput } from "./schema";

type ActionResult = { error?: string };

const BAD_TIME = "Tarih ve saati kontrol edin. Örnek: 05.11.2026 14:00";

/**
 * Formdan gelen alanları satıra çevirir. `starts_at` ofsetsiz yerel saattir
 * ("2026-11-05T14:00"); işletme saat diliminde yorumlanıp ofsetli ISO'ya
 * çevrilir. Ofsetsiz yazılırsa Postgres UTC sayar ve randevu 3 saat kayar.
 * `tz_normalized` (0029): bu satırın saati doğru yazıldı; eski veri
 * düzeltmesi (0030) buna dokunmaz.
 */
function toRow(values: AppointmentInput) {
  const optional = (v: string | undefined) => (!v || v === NONE ? null : v);
  const startsAt = fromDateTimeLocal(values.starts_at);
  if (!startsAt) return { error: BAD_TIME } as const;
  return {
    error: null,
    row: {
      customer_id: values.customer_id,
      service_id: optional(values.service_id),
      staff_member_id: optional(values.staff_member_id),
      package_id: optional(values.package_id),
      starts_at: startsAt,
      tz_normalized: true,
      status: values.status?.trim() || "planned",
      price: values.price ? Number(values.price.replace(",", ".")) : null,
      note: values.note?.trim() || null,
    },
  } as const;
}

/**
 * Randevu çakışma ve müsaitlik kontrolü.
 *
 * Personel seçilmemişse kontrol yapılmaz. Vardiya hiç tanımlanmamışsa
 * müsaitlik kısıtı uygulanmaz (geriye dönük uyumluluk) — ama aynı saate
 * ikinci randevu her durumda engellenir.
 *
 * Döndürdüğü metin kullanıcıya gösterilir; null = sorun yok.
 */
async function findScheduleProblem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staffId: string | null,
  startsAt: string,
  serviceId: string | null,
  excludeId?: string
): Promise<string | null> {
  if (!staffId) return null;

  // Hizmet süresi (yoksa 30 dk)
  let duration = 30;
  if (serviceId) {
    const { data } = await supabase
      .from("services")
      .select("duration_min")
      .eq("id", serviceId)
      .maybeSingle();
    duration = (data as { duration_min: number | null } | null)?.duration_min ?? 30;
  }

  const { data: conflicts, error: conflictErr } = await supabase.rpc(
    "check_appointment_conflict",
    {
      p_staff_id: staffId,
      p_starts_at: startsAt,
      p_duration: duration,
      p_exclude_id: excludeId ?? null,
    }
  );

  // Fonksiyon henüz kurulmadıysa (migration çalışmamışsa) engelleme.
  if (conflictErr) {
    console.error("check_appointment_conflict:", conflictErr);
    return null;
  }

  const list = (conflicts ?? []) as { conflict_start: string; customer_name: string }[];
  if (list.length > 0) {
    const c = list[0];
    const time = formatTime(c.conflict_start);
    return `Bu personelin ${time} saatinde ${c.customer_name} ile randevusu var. Başka bir saat veya personel seçin.`;
  }

  // Vardiya saatleri işletme saatindedir; dilimi açıkça veriyoruz (0029).
  const { data: available, error: availErr } = await supabase.rpc("is_staff_available_tz", {
    p_staff_id: staffId,
    p_starts_at: startsAt,
    p_tz: BUSINESS_TZ,
  });

  if (availErr) {
    console.error("is_staff_available_tz:", availErr);
    return null;
  }

  if (available === false) {
    return "Personel bu saatte çalışmıyor (vardiya dışı veya izinli).";
  }

  return null;
}

/**
 * Lead için randevu oluşturulunca onu "Randevu Planlandı" sütununa taşır.
 * Sütun silinmiş/yeniden adlandırılmışsa sessizce atlar.
 */
async function maybeMoveLeadOnAppointment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  customerId: string,
  createdBy: string | null
) {
  const { data: customer } = await supabase
    .from("customers")
    .select("is_lead, pipeline_stage_id")
    .eq("id", customerId)
    .single();
  if (!customer?.is_lead) return;

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("name", "Randevu Planlandı")
    .maybeSingle();
  if (!stage || customer.pipeline_stage_id === stage.id) return;

  await supabase
    .from("customers")
    .update({ pipeline_stage_id: stage.id })
    .eq("id", customerId);

  await logInteraction(supabase, {
    businessId,
    customerId,
    type: "asama_degisikligi",
    note: `Randevu oluşturuldu — "${stage.name}" aşamasına taşındı`,
    createdBy,
  });
}

/**
 * Randevu ekleme/düzenleme yetkisi (`randevu_yonet`: yönetici ve resepsiyon).
 * Ajans "yönet" modundaki süper-admin firma yöneticisi sayılır (RLS yine de
 * ikinci hat). Dönen businessId her sorguda kullanılır.
 */
async function authorizeManage(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ error: string } | { businessId: string }> {
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as { role: UserRole | null; business_id: string | null } | null;

  let role: UserRole | null = p?.business_id === businessId ? p.role : null;
  if (!role) {
    const acting = await getActingSession(supabase, user.id);
    if (acting?.businessId === businessId && acting.mode === "manage") role = "owner";
  }

  if (!can(role, "randevu_yonet")) return { error: "Bu işlem için yetkiniz yok." };
  return { businessId };
}

export async function createAppointment(
  input: AppointmentInput
): Promise<ActionResult> {
  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorizeManage(supabase);
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const built = toRow(parsed.data);
  if (built.error) return { error: built.error };
  const row = built.row;

  // Çift rezervasyon ve vardiya kontrolü
  const problem = await findScheduleProblem(
    supabase,
    row.staff_member_id,
    row.starts_at,
    row.service_id
  );
  if (problem) return { error: problem };

  const { error } = await supabase
    .from("appointments")
    .insert({ business_id: businessId, ...row });

  if (error) {
    console.error("createAppointment:", error);
    return { error: "Randevu eklenemedi." };
  }

  // Zaman çizelgesine otomatik kayıt
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logInteraction(supabase, {
    businessId,
    customerId: row.customer_id,
    type: "randevu_olusturuldu",
    note: "Randevu oluşturuldu",
    createdBy: user?.id ?? null,
  });

  // Lead ise pipeline'da "Randevu Planlandı" sütununa taşı (varsa).
  await maybeMoveLeadOnAppointment(
    supabase,
    businessId,
    row.customer_id,
    user?.id ?? null
  );

  revalidatePath("/randevular");
  revalidatePath("/takvim");
  revalidatePath("/leadler");
  return {};
}

export async function updateAppointment(
  id: string,
  input: AppointmentInput
): Promise<ActionResult> {
  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorizeManage(supabase);
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const built = toRow(parsed.data);
  if (built.error) return { error: built.error };
  const { starts_at: newStartsAt, tz_normalized, ...rest } = built.row;

  // Saat DEĞİŞMEDİYSE saklanan an olduğu gibi kalır ve "doğru yazıldı"
  // işareti verilmez: eski (düzeltilmemiş) bir randevunun yalnızca notunu
  // düzenlemek, kayık saatini düzeltme kapsamından çıkarmasın (0030).
  const { data: existing } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!existing) return { error: "Randevu bulunamadı. Sayfayı yenileyip tekrar deneyin." };
  const currentIso = (existing as { starts_at: string }).starts_at;
  const timeUnchanged = toDateTimeLocal(currentIso) === parsed.data.starts_at;
  const row = timeUnchanged ? rest : { ...rest, starts_at: newStartsAt, tz_normalized };

  // Çakışma kontrolü — düzenlenen randevunun kendisi hariç tutulur
  const problem = await findScheduleProblem(
    supabase,
    row.staff_member_id,
    timeUnchanged ? currentIso : newStartsAt,
    row.service_id,
    id
  );
  if (problem) return { error: problem };

  const { error } = await supabase
    .from("appointments")
    .update(row)
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateAppointment:", error);
    return { error: "Randevu güncellenemedi." };
  }

  revalidatePath("/randevular");
  revalidatePath("/takvim");
  return {};
}

export async function deleteAppointment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Randevu silinemedi: ${error.message}` };

  revalidatePath("/randevular");
  return {};
}

/**
 * "Geldi" işaretleme / geri alma için ortak yol: randevuyu ve kullanıcının
 * yetkisini doğrular. Geldi seans düşmez, gelir yazmaz — o iş "Tamamlandı"da.
 */
async function loadForArrival(id: string): Promise<
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      businessId: string;
      status: string | null;
    }
> {
  if (!id) return { error: "Randevu bulunamadı." };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { data: appt } = await supabase
    .from("appointments")
    .select("status, staff_member_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!appt) return { error: "Randevu bulunamadı. Sayfayı yenileyip tekrar deneyin." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, staff_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const p = profile as { role: UserRole | null; staff_id: string | null } | null;

  if (!canChangeArrival(p?.role, p?.staff_id, appt.staff_member_id as string | null)) {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  return { supabase, businessId, status: appt.status as string | null };
}

/** Planlandı -> Geldi. Geliş saatini şimdiye ayarlar. */
export async function markArrived(id: string): Promise<ActionResult> {
  const ctx = await loadForArrival(id);
  if ("error" in ctx) return ctx;

  if (!canMarkArrived(ctx.status)) {
    return {
      error:
        ctx.status === "arrived"
          ? "Müşteri zaten geldi olarak işaretli."
          : "Yalnızca planlanmış randevu \"Geldi\" olarak işaretlenebilir.",
    };
  }

  // Durum koşulu yarışı önler: arada değiştiyse güncelleme 0 satır döner.
  const { data, error } = await ctx.supabase
    .from("appointments")
    .update({ status: "arrived", arrived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .eq("status", "planned")
    .select("id");

  if (error) {
    console.error("markArrived:", error);
    return { error: "Geldi işaretlenemedi. Sayfayı yenileyip tekrar deneyin." };
  }
  if (!data || data.length === 0) {
    return { error: "Randevunun durumu değişmiş. Sayfayı yenileyip tekrar deneyin." };
  }

  revalidatePath("/randevular");
  revalidatePath("/takvim");
  revalidatePath("/panel");
  return {};
}

/** Geldi -> Planlandı. Geliş saatini temizler. */
export async function undoArrived(id: string): Promise<ActionResult> {
  const ctx = await loadForArrival(id);
  if ("error" in ctx) return ctx;

  if (!canUndoArrived(ctx.status)) {
    return { error: "Yalnızca \"Geldi\" olarak işaretli randevu geri alınabilir." };
  }

  const { data, error } = await ctx.supabase
    .from("appointments")
    .update({ status: "planned", arrived_at: null })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .eq("status", "arrived")
    .select("id");

  if (error) {
    console.error("undoArrived:", error);
    return { error: "Geri alınamadı. Sayfayı yenileyip tekrar deneyin." };
  }
  if (!data || data.length === 0) {
    return { error: "Randevunun durumu değişmiş. Sayfayı yenileyip tekrar deneyin." };
  }

  revalidatePath("/randevular");
  revalidatePath("/takvim");
  revalidatePath("/panel");
  return {};
}

const QUICK_STATUSES = ["planned", "completed", "no_show", "cancelled"] as const;
export type QuickStatus = (typeof QUICK_STATUSES)[number];

/**
 * Satırdan tek tıkla durum değiştirme (Tamamlandı, Gelmedi, İptal edildi;
 * geri alma için Planlandı). Çakışma kontrolü yapmaz: yalnızca durum değişir.
 * "Geldi" bu yoldan verilmez — yalnızca markArrived/undoArrived.
 * Yetki: Geldi ile aynı kural (yönetici/resepsiyon hepsi, uzman kendi randevusu).
 */
export async function setAppointmentStatus(
  id: string,
  status: QuickStatus
): Promise<ActionResult> {
  if (!(QUICK_STATUSES as readonly string[]).includes(status)) {
    return { error: "Geçersiz durum." };
  }
  const ctx = await loadForArrival(id);
  if ("error" in ctx) return ctx;

  const { data, error } = await ctx.supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .select("id");

  if (error) {
    console.error("setAppointmentStatus:", error);
    return { error: "Durum değiştirilemedi. Sayfayı yenileyip tekrar deneyin." };
  }
  if (!data || data.length === 0) {
    return { error: "Randevu bulunamadı. Sayfayı yenileyip tekrar deneyin." };
  }

  revalidatePath("/randevular");
  revalidatePath("/takvim");
  revalidatePath("/panel");
  return {};
}
