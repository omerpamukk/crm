import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/supabase/account";
import { can, type Capability } from "@/lib/permissions";
import { isModuleEnabled, type ModuleKey } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";

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

/**
 * Modül kapısı (0036): kapalı modülün sayfası URL ile de açılmaz;
 * kullanıcı modülü açabileceği Ayarlar bölümüne yönlenir.
 */
export async function requireModule(key: ModuleKey) {
  const enabled = await getEnabledModules();
  if (!isModuleEnabled(enabled, key)) redirect("/ayarlar?bolum=moduller");
}

/**
 * İşletmenin modül listesi (null = hepsi açık). Okunamazsa null döner:
 * modül yüzünden sayfa kırılmaz.
 */
export async function getEnabledModules(): Promise<string[] | null> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return null;
  const { data, error } = await supabase
    .from("businesses")
    .select("enabled_modules")
    .eq("id", businessId)
    .maybeSingle();
  if (error) return null;
  return (data as { enabled_modules: string[] | null } | null)?.enabled_modules ?? null;
}
