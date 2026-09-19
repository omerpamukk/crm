"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";

/** Tek bildirimi okundu işaretler. */
export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId)
    .is("read_at", null);

  if (error) {
    console.error("markNotificationRead:", error);
    return { error: "İşaretlenemedi." };
  }

  revalidatePath("/", "layout");
  return {};
}

/** Tüm okunmamış bildirimleri okundu işaretler. */
export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .is("read_at", null);

  if (error) {
    console.error("markAllNotificationsRead:", error);
    return { error: "İşaretlenemedi." };
  }

  revalidatePath("/", "layout");
  return {};
}
