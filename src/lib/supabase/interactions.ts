import type { createClient } from "./server";
import type { InteractionType } from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Bir etkileşim (zaman çizelgesi) kaydı ekler.
 * Server action'lar içinden çağrılır; hata durumunda sessizce yutar
 * (asıl işlemi — randevu/lead taşıma vb. — bloklamaması için).
 */
export async function logInteraction(
  supabase: SupabaseServer,
  params: {
    businessId: string;
    customerId: string;
    type: InteractionType;
    note?: string | null;
    createdBy?: string | null;
  }
): Promise<void> {
  await supabase.from("interactions").insert({
    business_id: params.businessId,
    customer_id: params.customerId,
    type: params.type,
    note: params.note ?? null,
    created_by: params.createdBy ?? null,
  });
}
