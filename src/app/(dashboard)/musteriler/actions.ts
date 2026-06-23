"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { customerSchema, type CustomerInput } from "./schema";

type ActionResult = { error?: string };

/** Form girdisini DB satırına dönüştürür (boş alanlar null, tags → dizi). */
function toRow(values: CustomerInput) {
  return {
    full_name: values.full_name.trim(),
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    source: values.source?.trim() || null,
    status: values.status?.trim() || "new",
    birthday: values.birthday?.trim() || null,
    note: values.note?.trim() || null,
    tags: values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null,
  };
}

export async function createCustomer(
  input: CustomerInput,
  options?: { asLead?: boolean }
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  // Varsayılan: yeni kayıt lead olarak, pipeline'ın ilk sütununa düşer.
  const asLead = options?.asLead ?? true;
  let pipelineStageId: string | null = null;
  if (asLead) {
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("business_id", businessId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    pipelineStageId = stage?.id ?? null;
  }

  const { error } = await supabase.from("customers").insert({
    business_id: businessId,
    is_lead: asLead,
    pipeline_stage_id: pipelineStageId,
    ...toRow(parsed.data),
  });

  if (error) return { error: `Kayıt eklenemedi: ${error.message}` };

  revalidatePath("/musteriler");
  revalidatePath("/leadler");
  return {};
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) return { error: `Müşteri güncellenemedi: ${error.message}` };

  revalidatePath("/musteriler");
  return {};
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) return { error: `Müşteri silinemedi: ${error.message}` };

  revalidatePath("/musteriler");
  return {};
}

/** Pano (Kanban) görünümünde sürükle-bırak ile durum değiştirmek için. */
export async function updateCustomerStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", id);

  if (error) return { error: `Durum güncellenemedi: ${error.message}` };

  revalidatePath("/musteriler");
  return {};
}
