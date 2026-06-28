import { createClient } from "@/lib/supabase/server";
import type { AdminPerm } from "@/lib/admin-perms";

export interface AdminContext {
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
  perms: string[];
}

/** UI gating için: kullanıcının admin bağlamı (RLS self-select sayesinde kendi satırını okur). */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("platform_admins")
    .select("is_owner, permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { userId: user.id, isAdmin: false, isOwner: false, perms: [] };
  return {
    userId: user.id,
    isAdmin: true,
    isOwner: !!(data as { is_owner: boolean }).is_owner,
    perms: ((data as { permissions: string[] | null }).permissions ?? []),
  };
}

export function can(ctx: AdminContext | null, perm: AdminPerm): boolean {
  if (!ctx?.isAdmin) return false;
  return ctx.isOwner || ctx.perms.includes(perm);
}

/** Server action kapısı: belirli yetki var mı? (kurucu → her zaman geçer) */
export async function assertPerm(perm: AdminPerm): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Oturum bulunamadı.";
  const { data: ok } = await supabase.rpc("has_admin_perm", { p: perm });
  if (!ok) return "Bu işlem için yetkiniz yok.";
  return null;
}

/** Server action kapısı: yalnızca kurucu (ekip yönetimi vb.). */
export async function assertOwner(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Oturum bulunamadı.";
  const { data: ok } = await supabase.rpc("is_platform_owner");
  if (!ok) return "Bu işlem yalnızca kurucu yöneticiye açıktır.";
  return null;
}
