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

export interface CustomerDetailInput {
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  service?: string;
  total_sessions?: string;
  session_days?: string;
  source?: string;
  tags: string[];
  note?: string;
}

/**
 * Sayfa içi zengin form: müşteri + (hizmet/seans verilmişse) paket oluşturur.
 * Seans günleri ayrı bir kolon olmadığından nota işlenir.
 */
export async function createCustomerWithDetails(
  input: CustomerDetailInput
): Promise<ActionResult> {
  const fullName = `${input.first_name?.trim() ?? ""} ${input.last_name?.trim() ?? ""}`.trim();
  if (!fullName) return { error: "Ad zorunludur." };
  if (input.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { error: "Geçerli bir e-posta girin." };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  let note = input.note?.trim() || "";
  if (input.session_days?.trim()) {
    const line = `Seans günleri: ${input.session_days.trim()}`;
    note = note ? `${note}\n${line}` : line;
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      is_lead: false,
      status: "active",
      full_name: fullName,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      source: input.source?.trim() || null,
      tags: input.tags.length ? input.tags : null,
      note: note || null,
    })
    .select("id")
    .single();

  if (error) return { error: `Müşteri eklenemedi: ${error.message}` };

  const total = input.total_sessions ? Number(input.total_sessions) : 0;
  if (input.service?.trim() && total > 0 && customer) {
    const { error: pkgErr } = await supabase.from("packages").insert({
      business_id: businessId,
      customer_id: customer.id,
      service_name: input.service.trim(),
      total_sessions: total,
      remaining_sessions: total,
      purchased_at: new Date().toISOString().slice(0, 10),
    });
    if (pkgErr) {
      return { error: `Müşteri eklendi ama paket oluşturulamadı: ${pkgErr.message}` };
    }
  }

  revalidatePath("/musteriler");
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
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("customers")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateCustomer:", error);
    return { error: "Müşteri güncellenemedi." };
  }

  revalidatePath("/musteriler");
  return {};
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteCustomer:", error);
    return { error: "Müşteri silinemedi." };
  }

  revalidatePath("/musteriler");
  return {};
}

/** Pano (Kanban) görünümünde sürükle-bırak ile durum değiştirmek için. */
export async function updateCustomerStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateCustomerStatus:", error);
    return { error: "Durum güncellenemedi." };
  }

  revalidatePath("/musteriler");
  return {};
}
