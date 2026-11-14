import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability, requireModule } from "@/lib/supabase/guard";

import { AutomationsView, type Automation } from "./automations-view";

export const metadata = { title: "Hatırlatmalar" };

/**
 * Otomatik hatırlatma kuralları. Kurallar `automations` tablosunda tutulur
 * (0025_automations.sql); zamanlayıcı bunları okuyup mesajları üretir.
 */
export default async function HatirlaticilarPage() {
  await requireCapability("musteri_yonet");
  await requireModule("hatirlaticilar");
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  // Erişim kapsamını RLS de sınırlar; işletme kimliği bulunursa ayrıca süzülür.
  let query = supabase
    .from("automations")
    .select("id, title, active, trigger_id, trigger_param, action_id, action_param, message, wa_template")
    .order("created_at", { ascending: true });
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;

  if (error) console.error("automations:", error);

  return <AutomationsView items={(data ?? []) as Automation[]} loadFailed={Boolean(error)} />;
}
