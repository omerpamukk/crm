import { cookies } from "next/headers";

import type { createClient } from "./server";
import { ACTING_COOKIE } from "./server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Server Action'larda kullanılır: aktif işletmenin business_id'sini döndürür.
 * Süper-admin bir firmayı görüntülüyor/yönetiyorsa (acting çerezi) o firmanın
 * id'sini döndürür; böylece "yönet" modunda eklemeler doğru firmaya yazılır.
 * Oturum/işletme yoksa null döner.
 */
export async function getBusinessId(
  supabase: SupabaseServer
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Acting (impersonation) modunda — yalnızca süper-adminlerde geçerli
  const acting = (await cookies()).get(ACTING_COOKIE)?.value;
  if (acting) {
    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (isAdmin) return acting;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  return profile?.business_id ?? null;
}
