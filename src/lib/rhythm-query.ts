import type { SupabaseClient } from "@supabase/supabase-js";

import { rhythmMap, type Rhythm, type RhythmRow } from "@/lib/customer-rhythm";

const COLS = "customer_id, visits, first_visit, last_visit, avg_interval_days, past_total, no_shows, cancels, next_appointment";

/**
 * İşletmenin tüm müşterilerinin ritmi (0035 customer_rhythm). RLS işletmeyi
 * süzer; yine de business_id ile sınırlanır (çok kiracılık kuralı).
 */
export async function fetchRhythm(
  supabase: SupabaseClient,
  businessId: string,
  now = new Date()
): Promise<{ map: Map<string, Rhythm>; error: boolean }> {
  const { data, error } = await supabase
    .from("customer_rhythm")
    .select(COLS)
    .eq("business_id", businessId)
    .limit(20000);

  if (error) {
    console.error("fetchRhythm:", error);
    return { map: new Map(), error: true };
  }
  return { map: rhythmMap((data ?? []) as RhythmRow[], now), error: false };
}

/** Geri kazanılabilir: düzenine göre gecikmiş ama henüz kaybedilmemiş. */
export function isWinnable(r: Rhythm): boolean {
  return r.segment === "ilgisi_azaliyor" || r.segment === "kaybetme_riski";
}
