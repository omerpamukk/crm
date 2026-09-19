"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { serviceSchema, type ServiceInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: ServiceInput) {
  return {
    name: values.name.trim(),
    category: values.category?.trim() || null,
    duration_min: values.duration_min ? Number(values.duration_min) : null,
    price: values.price ? Number(values.price.replace(",", ".")) : null,
  };
}

export async function createService(input: ServiceInput): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("services")
    .insert({ business_id: businessId, ...toRow(parsed.data) });

  if (error) return { error: `Hizmet eklenemedi: ${error.message}` };

  revalidatePath("/hizmetler");
  return {};
}

export async function updateService(
  id: string,
  input: ServiceInput
): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("services")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Hizmet güncellenemedi: ${error.message}` };

  revalidatePath("/hizmetler");
  return {};
}

export async function deleteService(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Hizmet silinemedi: ${error.message}` };

  revalidatePath("/hizmetler");
  return {};
}
