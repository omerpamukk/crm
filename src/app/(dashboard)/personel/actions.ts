"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { staffSchema, type StaffInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: StaffInput) {
  return {
    full_name: values.full_name.trim(),
    title: values.title?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    commission_rate: values.commission_rate ? Number(values.commission_rate.replace(",", ".")) : 0,
    is_active: values.is_active,
    note: values.note?.trim() || null,
    color: values.color ?? null,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Tablo/sütun henüz yok (0042 çalışmadı): özellik sessizce atlanır. */
function isMissing(code: string | undefined) {
  return code === "42P01" || code === "PGRST205" || code === "42703" || code === "PGRST204";
}

/**
 * Personelin verdiği hizmetleri yazar. "Tüm hizmetler" = hiç satır yok.
 * Yalnızca bu işletmenin hizmetleri kabul edilir.
 */
async function saveServices(supabase: Supabase, businessId: string, staffId: string, values: StaffInput) {
  const wanted = values.all_services ? [] : [...new Set(values.service_ids)];
  let ids: string[] = [];
  if (wanted.length > 0) {
    const { data } = await supabase.from("services").select("id").eq("business_id", businessId).in("id", wanted);
    ids = (data ?? []).map((r) => r.id as string);
  }
  const del = await supabase.from("staff_services").delete().eq("business_id", businessId).eq("staff_id", staffId);
  if (del.error) {
    if (isMissing(del.error.code)) return null;
    return del.error;
  }
  if (ids.length === 0) return null;
  const ins = await supabase
    .from("staff_services")
    .insert(ids.map((service_id) => ({ business_id: businessId, staff_id: staffId, service_id })));
  return ins.error && !isMissing(ins.error.code) ? ins.error : null;
}

/** Renk sütunu yoksa (0042 çalışmadı) rengi çıkarıp yeniden dener. */
function withoutColor<T extends { color?: unknown }>(row: T) {
  const rest = { ...row };
  delete rest.color;
  return rest;
}

function revalidateAll() {
  revalidatePath("/personel");
  revalidatePath("/randevu-linki");
  revalidatePath("/randevular");
  revalidatePath("/takvim");
}

export async function createStaff(input: StaffInput): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "personel_yonet");
  if ("error" in auth) return { error: auth.error };

  const row = { business_id: auth.businessId, ...toRow(parsed.data) };
  let res = await supabase.from("staff").insert(row).select("id").single();
  if (res.error && isMissing(res.error.code)) {
    res = await supabase.from("staff").insert(withoutColor(row)).select("id").single();
  }
  const { data, error } = res;

  if (error || !data) {
    console.error("createStaff:", error);
    return { error: "Personel eklenemedi. Tekrar deneyin." };
  }

  const svcError = await saveServices(supabase, auth.businessId, data.id as string, parsed.data);
  if (svcError) {
    console.error("createStaff services:", svcError);
    revalidateAll();
    return { error: "Personel eklendi ama hizmetleri kaydedilemedi. Düzenleyip tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function updateStaff(id: string, input: StaffInput): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "personel_yonet");
  if ("error" in auth) return { error: auth.error };

  const update = (row: Record<string, unknown>) =>
    supabase.from("staff").update(row).eq("id", id).eq("business_id", auth.businessId).select("id");
  let res = await update(toRow(parsed.data));
  if (res.error && isMissing(res.error.code)) res = await update(withoutColor(toRow(parsed.data)));

  if (res.error || !res.data?.length) {
    console.error("updateStaff:", res.error);
    return { error: "Personel güncellenemedi. Tekrar deneyin." };
  }

  const svcError = await saveServices(supabase, auth.businessId, id, parsed.data);
  if (svcError) {
    console.error("updateStaff services:", svcError);
    return { error: "Hizmetler kaydedilemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "personel_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("staff").delete().eq("id", id).eq("business_id", auth.businessId);

  if (error) {
    console.error("deleteStaff:", error);
    if (error.code === "23503") {
      return { error: "Randevusu olan personel silinemez. Silmek yerine pasife alın." };
    }
    return { error: "Personel silinemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}
