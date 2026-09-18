import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/supabase/account";
import { can, type Capability } from "@/lib/permissions";

/**
 * Sayfa seviyesi yetki kapısı.
 *
 * Menüyü role göre gizlemek yeterli değil — kullanıcı URL'i doğrudan
 * yazabilir. Korunan sayfalar render'dan önce bunu çağırır.
 *
 * Kullanım (server component):
 *   const { role } = await requireCapability("finans");
 */
export async function requireCapability(cap: Capability) {
  const ctx = await getAccountContext();
  if (!can(ctx.role, cap)) redirect("/panel");
  return ctx;
}
