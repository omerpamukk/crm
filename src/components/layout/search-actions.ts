"use server";

import { createClient } from "@/lib/supabase/server";

export type CustomerHit = {
  id: string;
  full_name: string;
  phone: string | null;
  is_lead: boolean;
};

/**
 * Global arama: müşteri/lead adı, telefon, e-posta üzerinde.
 * RLS sayesinde yalnızca kullanıcının işletmesindeki kayıtlar döner.
 */
export async function searchCustomers(query: string): Promise<CustomerHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();

  // Trigram indeksli arama (0022_search_perf.sql). Baştan eşleşenleri
  // önceliklendirir; eski `ilike '%q%'` her aramada tam tarama yapıyordu.
  const { data, error } = await supabase.rpc("search_customers", { p_query: q });

  if (error) {
    console.error("searchCustomers:", error);
    return [];
  }

  return (data ?? []) as CustomerHit[];
}
