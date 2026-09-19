import { createClient } from "@/lib/supabase/server";

/**
 * İşletme içi denetim kaydı (0017_business_audit.sql).
 *
 * "Kim neyi sildi/değiştirdi" izini tutar. Okuma yalnızca işletme
 * sahibinde; kayıt değiştirilemez (update/delete politikası yok).
 *
 * Hata durumunda sessizce geçer — log yazılamadı diye asıl işlem
 * başarısız sayılmamalı, ama sunucuya not düşülür.
 */
export async function logBusinessAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    businessId: string;
    action: string;
    entity: string;
    entityId?: string | null;
    summary?: string | null;
    detail?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let label = user?.email ?? "Sistem";
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const name = (data as { full_name: string | null } | null)?.full_name;
      if (name) label = name;
    }

    await supabase.from("business_audit_log").insert({
      business_id: params.businessId,
      actor_id: user?.id ?? null,
      actor_label: label,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      summary: params.summary ?? null,
      detail: params.detail ?? {},
    });
  } catch (error) {
    console.error("logBusinessAction:", error);
  }
}
