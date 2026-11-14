import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { isSmsConnected } from "@/lib/messaging/send";
import { can } from "@/lib/permissions";

import { ReviewsView, type FeedbackRow } from "./reviews-view";

export const metadata = { title: "Yorumlar" };

export default async function YorumlarPage() {
  const { role } = await requireCapability("musteri_yonet");
  const canSettings = can(role, "ayarlar");

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return <ReviewsView ready={false} loadFailed rows={[]} enabled={false} googleUrl="" canSettings={false} smsConnected={false} />;

  const [fbRes, bizRes, ruleRes, smsConnected] = await Promise.all([
    supabase
      .from("feedback_requests")
      .select("id, created_at, rating, comment, wants_call, answered_at, google_clicked_at, handled_at, customer_id, customer:customers(full_name, phone)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("businesses").select("google_review_url").eq("id", businessId).maybeSingle(),
    supabase.from("automations").select("active").eq("business_id", businessId).eq("trigger_id", "randevu_tamamlandi").limit(1),
    isSmsConnected(businessId),
  ]);

  const missing = ["42P01", "PGRST205", "42703"].includes(fbRes.error?.code ?? "") || ["42703"].includes(bizRes.error?.code ?? "");
  if ((fbRes.error || bizRes.error) && !missing) console.error("yorumlar:", fbRes.error ?? bizRes.error);

  type Raw = Omit<FeedbackRow, "name" | "phone"> & {
    customer: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null;
  };
  const rows: FeedbackRow[] = ((fbRes.data ?? []) as Raw[]).map(({ customer, ...r }) => {
    const c = Array.isArray(customer) ? customer[0] : customer;
    return { ...r, name: c?.full_name ?? "Müşteri", phone: c?.phone ?? null };
  });

  return (
    <ReviewsView
      ready={!missing}
      loadFailed={Boolean((fbRes.error || bizRes.error) && !missing)}
      rows={rows}
      enabled={Boolean(((ruleRes.data ?? [])[0] as { active: boolean } | undefined)?.active)}
      googleUrl={(bizRes.data as { google_review_url: string | null } | null)?.google_review_url ?? ""}
      canSettings={canSettings}
      smsConnected={smsConnected}
    />
  );
}
