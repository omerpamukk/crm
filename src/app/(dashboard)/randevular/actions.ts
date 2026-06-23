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
  const { error } = await supabase
    .from("appointments")
    .insert({ business_id: businessId, ...row });

  if (error) return { error: `Randevu eklenemedi: ${error.message}` };

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
  const { error } = await supabase
    .from("appointments")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) return { error: `Randevu güncellenemedi: ${error.message}` };

  revalidatePath("/randevular");
  return {};
}

export async function deleteAppointment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);

  if (error) return { error: `Randevu silinemedi: ${error.message}` };

  revalidatePath("/randevular");
  return {};
}
