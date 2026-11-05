import { cookies } from "next/headers";

import type { createClient } from "./server";
import { ACTING_COOKIE } from "./server";
import { getActingSession } from "./admin-context";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Server Action'larda kullanılır: aktif işletmenin business_id'sini döndürür.
 * Süper-admin bir firmayı görüntülüyor/yönetiyorsa (sunucu oturum tablosu, 0026) o firmanın
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

  // Acting (impersonation) modunda — yalnızca süper-adminlerde geçerli.
  // Çerez yalnızca ön kontrol: firma kullanıcılarının her işleminde oturum
  // tablosu sorgulanmasın. Yetkinin kaynağı yine tablo (0026).
  const hasActingHint = (await cookies()).has(ACTING_COOKIE);
  const acting = hasActingHint ? await getActingSession(supabase, user.id) : null;
  if (acting) {
    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (isAdmin) return acting.businessId;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  return profile?.business_id ?? null;
}
