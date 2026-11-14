import type { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Personel seçeneklerine verdiği hizmetleri ekler (0042, staff_services).
 * service_ids boş = tüm hizmetler. Tablo yoksa ya da okunamazsa liste
 * olduğu gibi döner (herkes tüm hizmetleri verir sayılır).
 */
export async function attachServiceIds<T extends { id: string }>(
  supabase: Supabase,
  staff: T[],
  businessId?: string | null
): Promise<(T & { service_ids: string[] })[]> {
  const plain = staff.map((s) => ({ ...s, service_ids: [] as string[] }));
  if (staff.length === 0) return plain;
  const biz = businessId ?? (await getBusinessId(supabase));
  if (!biz) return plain;
  const { data, error } = await supabase
    .from("staff_services")
    .select("staff_id, service_id")
    .eq("business_id", biz);
  if (error || !data) return plain;
  const map = new Map<string, string[]>();
  for (const r of data as { staff_id: string; service_id: string }[]) {
    const list = map.get(r.staff_id) ?? [];
    list.push(r.service_id);
    map.set(r.staff_id, list);
  }
  return plain.map((s) => ({ ...s, service_ids: map.get(s.id) ?? [] }));
}
