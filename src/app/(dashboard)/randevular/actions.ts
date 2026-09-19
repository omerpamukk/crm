"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { logInteraction } from "@/lib/supabase/interactions";
import { appointmentSchema, NONE, type AppointmentInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: AppointmentInput) {
  const optional = (v: string | undefined) => (!v || v === NONE ? null : v);
  return {
    customer_id: values.customer_id,
    service_id: optional(values.service_id),
    staff_member_id: optional(values.staff_member_id),
    package_id: optional(values.package_id),
    starts_at: values.starts_at,
    status: values.status?.trim() || "planned",
    price: values.price ? Number(values.price.replace(",", ".")) : null,
    note: values.note?.trim() || null,
  };
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
    const time = new Date(c.conflict_start).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Bu personelin ${time} saatinde ${c.customer_name} ile randevusu var. Başka saat veya personel seçin.`;
  }

  const { data: available, error: availErr } = await supabase.rpc("is_staff_available", {
    p_staff_id: staffId,
    p_starts_at: startsAt,
  });

  if (availErr) {
    console.error("is_staff_available:", availErr);
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

export async function createAppointment(
  input: AppointmentInput
): Promise<ActionResult> {
  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const row = toRow(parsed.data);

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
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const row = toRow(parsed.data);

  // Çakışma kontrolü — düzenlenen randevunun kendisi hariç tutulur
  const problem = await findScheduleProblem(
    supabase,
    row.staff_member_id,
    row.starts_at,
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
