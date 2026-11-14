"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import type { BookingSettings } from "@/types/database";

type ActionResult = { error?: string };

function genToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + new Date().getTime().toString(36);
}

/**
 * İşletmenin randevu linki ayarlarını döndürür; yoksa oluşturur.
 * /randevu-linki sayfası ilk açılışta bunu çağırır.
 */
export async function ensureBookingSettings(): Promise<{
  settings?: BookingSettings;
  error?: string;
}> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { data: existing } = await supabase
    .from("booking_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) return { settings: existing as BookingSettings };

  const { data: created, error } = await supabase
    .from("booking_settings")
    .insert({ business_id: businessId, token: genToken() })
    .select("*")
    .single();

  if (error) {
    console.error("ensureBookingSettings:", error);
    return { error: "Randevu linki hazırlanamadı. Sayfayı yenileyip tekrar deneyin." };
  }
  return { settings: created as BookingSettings };
}

/** Bir hizmetin online randevuda görünürlüğünü değiştirir. */
export async function toggleServiceBookable(
  serviceId: string,
  bookable: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;
  const { error } = await supabase
    .from("services")
    .update({ bookable })
    .eq("id", serviceId)
    .eq("business_id", businessId);
  if (error) {
    console.error("booking-actions:", error);
    return { error: "Güncellenemedi. Biraz sonra tekrar deneyin." };
  }
  revalidatePath("/randevu-linki");
  return {};
}

export interface BookingSettingsInput {
  slot_minutes: number;
  work_days: number[];
  start_time: string;
  end_time: string;
}

/** Çalışma günleri / saatleri / slot süresini günceller. */
export async function updateBookingSettings(
  id: string,
  input: BookingSettingsInput
): Promise<ActionResult> {
  if (input.work_days.length === 0)
    return { error: "En az bir çalışma günü seçin." };
  if (input.start_time >= input.end_time)
    return { error: "Kapanış saati açılıştan sonra olmalı." };

  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;
  const { error } = await supabase
    .from("booking_settings")
    .update({
      slot_minutes: input.slot_minutes,
      work_days: input.work_days,
      start_time: input.start_time,
      end_time: input.end_time,
    })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("updateBookingSettings:", error);
    return { error: "Çalışma saatleri kaydedilemedi. Biraz sonra tekrar deneyin." };
  }
  revalidatePath("/randevu-linki");
  return {};
}

/** Randevu linkini açık/kapalı yapar (kapalıyken müşteriler randevu alamaz). */
export async function setBookingActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;
  const { error } = await supabase
    .from("booking_settings")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("booking-actions:", error);
    return { error: "Güncellenemedi. Biraz sonra tekrar deneyin." };
  }
  revalidatePath("/randevu-linki");
  return {};
}

/** Online randevuda müşteri personel seçebilsin mi (0042). */
export async function setChooseStaff(id: string, on: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };
  const { error } = await supabase
    .from("booking_settings")
    .update({ choose_staff: on })
    .eq("id", id)
    .eq("business_id", auth.businessId);
  if (error) {
    console.error("setChooseStaff:", error);
    return { error: "Güncellenemedi. Biraz sonra tekrar deneyin." };
  }
  revalidatePath("/randevu-linki");
  return {};
}

/** Yeni token üretir (eski link çalışmaz hale gelir). */
export async function regenerateBookingToken(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;
  const { error } = await supabase
    .from("booking_settings")
    .update({ token: genToken() })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) {
    console.error("regenerateBookingToken:", error);
    return { error: "Yeni link oluşturulamadı. Biraz sonra tekrar deneyin." };
  }
  revalidatePath("/randevu-linki");
  return {};
}
