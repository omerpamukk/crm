"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { staffSchema, type StaffInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: StaffInput) {
  return {
    full_name: values.full_name.trim(),
    title: values.title?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    commission_rate: values.commission_rate
      ? Number(values.commission_rate.replace(",", "."))
      : 0,
    is_active: values.is_active,
    note: values.note?.trim() || null,
  };
}

export async function createStaff(input: StaffInput): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("staff")
    .insert({ business_id: businessId, ...toRow(parsed.data) });

  if (error) return { error: `Personel eklenemedi: ${error.message}` };

  revalidatePath("/personel");
  return {};
}

export async function updateStaff(
  id: string,
  input: StaffInput
): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("staff")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Personel güncellenemedi: ${error.message}` };

  revalidatePath("/personel");
  return {};
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Personel silinemedi: ${error.message}` };

  revalidatePath("/personel");
  return {};
}
