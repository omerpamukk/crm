"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { logBusinessAction } from "@/lib/supabase/business-audit";
import { getAccountContext } from "@/lib/supabase/account";
import { can, denied } from "@/lib/permissions";
import { fromDateTimeLocal, zonedParts } from "@/lib/zaman";
import { setMarketingConsent } from "@/lib/consent";
import { customerSchema, type CustomerInput } from "./schema";

type ActionResult = { error?: string };

/** Müşteri yazma işlemleri için sunucu tarafı yetki kontrolü (arayüz gizlemesi tek başına yetmez). */
async function canManageCustomers(): Promise<boolean> {
  const { role } = await getAccountContext();
  return can(role, "musteri_yonet");
}

function todayKeyTR(): string {
  const p = zonedParts(Date.now());
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

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
  if (!(await canManageCustomers())) return denied();
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

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      is_lead: asLead,
      pipeline_stage_id: pipelineStageId,
      ...toRow(parsed.data),
    })
    .select("id")
    .single();

  if (error) {
    console.error("createCustomer:", error);
    return { error: "Kayıt eklenemedi. Biraz sonra tekrar deneyin." };
  }

  if (parsed.data.marketing_consent && created) {
    const consent = await setMarketingConsent(supabase, businessId, created.id, true);
    if (consent.error) return { error: "Kayıt eklendi ama kampanya izni kaydedilemedi. Kartından tekrar deneyin." };
  }

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
  marketing_consent?: boolean;
}

/**
 * Sayfa içi zengin form: müşteri + (hizmet/seans verilmişse) paket oluşturur.
 * Seans günleri ayrı bir kolon olmadığından nota işlenir.
 */
export async function createCustomerWithDetails(
  input: CustomerDetailInput
): Promise<ActionResult> {
  // Yeni müşteri eklemek tüm rollere açık (Uzman dahil); düzenleme/silme musteri_yonet ister.
  const { role } = await getAccountContext();
  if (!can(role, "musteri_ekle")) return denied();
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

  if (error) {
    console.error("createCustomerWithDetails:", error);
    return { error: "Müşteri eklenemedi. Biraz sonra tekrar deneyin." };
  }

  if (input.marketing_consent && customer) {
    const consent = await setMarketingConsent(supabase, businessId, customer.id, true);
    if (consent.error) return { error: "Müşteri eklendi ama kampanya izni kaydedilemedi. Kartından tekrar deneyin." };
  }

  const total = input.total_sessions ? Number(input.total_sessions) : 0;
  if (input.service?.trim() && total > 0 && customer) {
    const { error: pkgErr } = await supabase.from("packages").insert({
      business_id: businessId,
      customer_id: customer.id,
      service_name: input.service.trim(),
      total_sessions: total,
      remaining_sessions: total,
      // Bugün (İstanbul günü), işletme saatiyle öğlen.
      purchased_at: fromDateTimeLocal(`${todayKeyTR()}T12:00`),
    });
    if (pkgErr) {
      console.error("createCustomerWithDetails paket:", pkgErr);
      return { error: "Müşteri eklendi ama paket oluşturulamadı. Paketi müşteri kartından ekleyin." };
    }
  }

  revalidatePath("/musteriler");
  return {};
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<ActionResult> {
  if (!(await canManageCustomers())) return denied();
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

  if (parsed.data.marketing_consent !== undefined) {
    const consent = await setMarketingConsent(supabase, businessId, id, parsed.data.marketing_consent);
    if (consent.error) return { error: "Bilgiler kaydedildi ama kampanya izni güncellenemedi." };
  }

  revalidatePath("/musteriler");
  return {};
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  if (!(await canManageCustomers())) return denied();
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  // Silmeden önce adı al — log kaydında görünsün
  const { data: before } = await supabase
    .from("customers")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteCustomer:", error);
    return { error: "Müşteri silinemedi." };
  }

  await logBusinessAction(supabase, {
    businessId,
    action: "sil",
    entity: "musteri",
    entityId: id,
    summary: (before as { full_name: string } | null)?.full_name ?? "Müşteri",
  });

  revalidatePath("/musteriler");
  return {};
}

/** Pano (Kanban) görünümünde sürükle-bırak ile durum değiştirmek için. */
export async function updateCustomerStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  if (!(await canManageCustomers())) return denied();
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
