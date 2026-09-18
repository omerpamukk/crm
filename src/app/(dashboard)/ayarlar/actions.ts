"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { getAccountContext } from "@/lib/supabase/account";
import { can } from "@/lib/permissions";
import {
  businessInfoSchema,
  ownerProfileSchema,
  workingHoursSchema,
  type BusinessInfoInput,
  type OwnerProfileInput,
  type WorkingHoursInput,
} from "./schema";

type ActionResult = { error?: string };

const DENIED: ActionResult = { error: "Bu işlem için yetkiniz yok." };

/** Ayarlar yalnızca işletme sahibine açık. */
async function assertOwnerAccess(): Promise<boolean> {
  const { role } = await getAccountContext();
  return can(role, "ayarlar");
}

/** Firma kartı: ad, sektör, telefon, e-posta, adres. */
export async function updateBusinessInfo(
  input: BusinessInfoInput
): Promise<ActionResult> {
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const v = parsed.data;
  const { error } = await supabase
    .from("businesses")
    .update({
      name: v.name.trim(),
      sector: v.sector?.trim() || null,
      phone: v.phone?.trim() || null,
      email: v.email?.trim() || null,
      address: v.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    console.error("updateBusinessInfo:", error);
    return { error: "Firma bilgileri kaydedilemedi." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/** İşletme sahibi kartı: ad soyad, telefon. */
export async function updateOwnerProfile(
  input: OwnerProfileInput
): Promise<ActionResult> {
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = ownerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name.trim(),
      phone: parsed.data.phone?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateOwnerProfile:", error);
    return { error: "Profil kaydedilemedi." };
  }

  revalidatePath("/ayarlar");
  return {};
}

/**
 * Çalışma saatleri: businesses.working_hours (jsonb).
 * booking_settings de senkron tutulur — online randevu aynı saatleri kullanmalı.
 */
export async function updateWorkingHours(
  input: WorkingHoursInput
): Promise<ActionResult> {
  if (!(await assertOwnerAccess())) return DENIED;

  const parsed = workingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const days = parsed.data.days;

  const { error } = await supabase
    .from("businesses")
    .update({
      working_hours: { days },
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    console.error("updateWorkingHours:", error);
    return { error: "Çalışma saatleri kaydedilemedi." };
  }

  // Online randevu ayarlarını da hizala (varsa).
  const open = days.filter((d) => d.open);
  if (open.length > 0) {
    await supabase
      .from("booking_settings")
      .update({
        work_days: open.map((d) => d.day),
        // booking_settings tek bir global aralık tutuyor:
        // en erken açılış ve en geç kapanış kullanılır.
        start_time: open.reduce((a, d) => (d.start < a ? d.start : a), open[0].start),
        end_time: open.reduce((a, d) => (d.end > a ? d.end : a), open[0].end),
      })
      .eq("business_id", businessId);
  }

  revalidatePath("/ayarlar");
  revalidatePath("/randevu-linki");
  return {};
}
