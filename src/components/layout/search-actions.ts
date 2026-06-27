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
  const like = `%${q}%`;
  const { data } = await supabase
    .from("customers")
    .select("id, full_name, phone, is_lead")
    .or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
    .order("full_name")
    .limit(8);

  return (data ?? []) as CustomerHit[];
}
