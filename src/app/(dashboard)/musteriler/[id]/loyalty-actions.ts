"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { countVisits, loyaltyProgress, readLoyalty } from "@/lib/loyalty";

/**
 * Hediye verildi: sayaç sıfırlanır. Hak sunucuda yeniden hesaplanır;
 * istemciden gelen sayıya güvenilmez.
 */
export async function redeemLoyalty(customerId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(customerId).success) return { error: "Geçersiz müşteri." };
  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId, userId } = auth;

  const [bizRes, apptRes, lastRes] = await Promise.all([
    supabase.from("businesses").select("loyalty_target, loyalty_reward, loyalty_notify_before").eq("id", businessId).maybeSingle(),
    supabase.from("appointments").select("starts_at, status").eq("business_id", businessId).eq("customer_id", customerId).limit(2000),
    supabase
      .from("loyalty_redemptions")
      .select("created_at")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (bizRes.error || apptRes.error || lastRes.error) {
    console.error("redeemLoyalty:", bizRes.error ?? apptRes.error ?? lastRes.error);
    return { error: "Kaydedilemedi. Tekrar deneyin." };
  }
  const settings = readLoyalty(bizRes.data as never);
  if (!settings) return { error: "Sadakat kartı kapalı. Ayarlar → Sadakat kartı'ndan açın." };
  const since = ((lastRes.data ?? [])[0] as { created_at: string } | undefined)?.created_at ?? null;
  const visits = countVisits((apptRes.data ?? []) as { starts_at: string; status: string | null }[], since);
  if (!loyaltyProgress(visits, settings.target).eligible) return { error: "Bu müşterinin henüz hediye hakkı yok." };

  const { error } = await supabase.from("loyalty_redemptions").insert({
    business_id: businessId,
    customer_id: customerId,
    created_by: userId,
    reward: settings.reward,
    visits,
  });
  if (error) {
    console.error("redeemLoyalty insert:", error);
    return { error: "Kaydedilemedi. Tekrar deneyin." };
  }
  revalidatePath(`/musteriler/${customerId}`);
  return {};
}
