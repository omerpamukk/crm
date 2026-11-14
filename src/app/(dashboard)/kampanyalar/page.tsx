import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability, requireModule } from "@/lib/supabase/guard";
import { isSmsConnected } from "@/lib/messaging/send";

import { CampaignsView, type CampaignRow } from "./campaigns-view";

export const metadata = { title: "Kampanyalar" };

// Toplu gönderim bu sayfanın server action'ında çalışır.
export const maxDuration = 60;

export default async function KampanyalarPage() {
  await requireCapability("musteri_yonet");
  await requireModule("kampanyalar");

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <CampaignsView campaigns={[]} ready={false} smsConnected={false} loadFailed />;

  const [campRes, resultRes, smsConnected] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, created_at, name, audience, body, recipient_count, sent_count, failed_count, status, sent_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("campaign_results").select("campaign_id, booked, revenue").eq("business_id", businessId).limit(500),
    isSmsConnected(businessId),
  ]);

  // Tablo henüz yoksa (0038 çalıştırılmadı) sayfa "hazır değil" der, kırılmaz.
  const missing = campRes.error?.code === "42P01" || campRes.error?.code === "PGRST205";
  if (campRes.error && !missing) console.error("kampanyalar:", campRes.error);

  const results = new Map(
    ((resultRes.data ?? []) as { campaign_id: string; booked: number; revenue: number | string }[]).map((r) => [
      r.campaign_id,
      { booked: r.booked ?? 0, revenue: Number(r.revenue ?? 0) },
    ])
  );

  const campaigns: CampaignRow[] = ((campRes.data ?? []) as Omit<CampaignRow, "booked" | "revenue">[]).map((c) => ({
    ...c,
    booked: results.get(c.id)?.booked ?? 0,
    revenue: results.get(c.id)?.revenue ?? 0,
  }));

  return (
    <CampaignsView
      campaigns={campaigns}
      ready={!missing}
      smsConnected={smsConnected}
      loadFailed={Boolean(campRes.error && !missing)}
    />
  );
}
