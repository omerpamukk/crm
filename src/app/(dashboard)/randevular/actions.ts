"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { appointmentSchema, NONE, type AppointmentInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: AppointmentInput) {
  const optional = (v: string | undefined) => (!v || v === NONE ? null : v);
  return {
    customer_id: values.customer_id,
    service_id: optional(values.service_id),
    staff_id: optional(values.staff_id),
    starts_at: values.starts_at,
    status: values.status?.trim() || "planned",
    note: values.note?.trim() || null,
  };
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

  const { error } = await supabase
    .from("appointments")
    .insert({ business_id: businessId, ...toRow(parsed.data) });

  if (error) return { error: `Randevu eklenemedi: ${error.message}` };

  revalidatePath("/randevular");
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
