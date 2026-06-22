import type { createClient } from "./server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Server Action'larda kullanılır: giriş yapan kullanıcının business_id'sini döndürür.
 * Oturum/işletme yoksa null döner.
 */
export async function getBusinessId(
  supabase: SupabaseServer
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  return profile?.business_id ?? null;
}
