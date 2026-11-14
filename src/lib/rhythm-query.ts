import type { SupabaseClient } from "@supabase/supabase-js";

import { rhythmMap, type Rhythm, type RhythmRow } from "@/lib/customer-rhythm";

const COLS = "customer_id, visits, first_visit, last_visit, avg_interval_days, past_total, no_shows, cancels, next_appointment";

const PAGE = 1000;

/**
 * Müşterilerin ritmi (0035 customer_rhythm). RLS işletmeyi süzer; yine de
 * business_id ile sınırlanır (çok kiracılık kuralı).
 *
 * `customerId` verilirse yalnızca o müşteri çekilir (Müşteri 360). Aksi halde
 * PostgREST'in 1000 satır sınırı yüzünden sıralı sayfalarla hepsi okunur;
 * böylece her ekran aynı sayıyı verir. Herhangi bir sayfa hata verirse
 * eksik veriyle 0 göstermek yerine `error: true` döner.
 */
export async function fetchRhythm(
  supabase: SupabaseClient,
  businessId: string,
  now = new Date(),
  opts: { customerId?: string } = {}
): Promise<{ map: Map<string, Rhythm>; error: boolean }> {
  const rows: RhythmRow[] = [];

  for (let from = 0; ; from += PAGE) {
    let q = supabase.from("customer_rhythm").select(COLS).eq("business_id", businessId);
    if (opts.customerId) q = q.eq("customer_id", opts.customerId);
    const { data, error } = await q.order("customer_id").range(from, from + PAGE - 1);

    if (error) {
      console.error("fetchRhythm:", error);
      return { map: new Map(), error: true };
    }
    const page = (data ?? []) as RhythmRow[];
    rows.push(...page);
    if (opts.customerId || page.length < PAGE) break;
  }

  return { map: rhythmMap(rows, now), error: false };
}

/** Geri kazanılabilir: düzenine göre gecikmiş ama henüz kaybedilmemiş. */
export function isWinnable(r: Rhythm): boolean {
  return r.segment === "ilgisi_azaliyor" || r.segment === "kaybetme_riski";
}
