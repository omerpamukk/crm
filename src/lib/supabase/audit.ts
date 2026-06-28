import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Ajans işlem geçmişine kayıt ekler. Hatası asıl işlemi bozmaz. */
export async function logAdminAction(
  action: string,
  opts?: { businessId?: string | null; businessName?: string | null; detail?: string | null },
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let actorName: string | null = user.email ?? null;
    const { data: pa } = await supabase.from("platform_admins").select("full_name").eq("user_id", user.id).maybeSingle();
    const paName = (pa as { full_name: string | null } | null)?.full_name;
    if (paName) actorName = paName;

    const admin = createAdminClient();
    let businessName = opts?.businessName ?? null;
    if (!businessName && opts?.businessId) {
      const { data: b } = await admin.from("businesses").select("name").eq("id", opts.businessId).maybeSingle();
      businessName = (b as { name: string | null } | null)?.name ?? null;
    }

    await admin.from("platform_audit_log").insert({
      actor_id: user.id,
      actor_name: actorName,
      action,
      business_id: opts?.businessId ?? null,
      business_name: businessName,
      detail: opts?.detail ?? null,
    });
  } catch {
    // audit yazımı başarısız olsa da sessiz geç
  }
}
