import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminContext } from "@/lib/supabase/admin-context";

import { EkipView, type AdminRow } from "./ekip-view";

export const dynamic = "force-dynamic";

export default async function EkipPage() {
  const ctx = await getAdminContext();
  if (!ctx?.isAdmin) redirect("/giris");
  if (!ctx.isOwner) redirect("/admin"); // ekip yönetimi yalnızca kurucu

  const supabase = await createClient();
  const { data: admins } = await supabase
    .from("platform_admins")
    .select("user_id, full_name, is_owner, permissions, created_at")
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  // E-posta/telefon service_role ile
  const meta = new Map<string, { email: string; phone: string | null }>();
  try {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of list?.users ?? []) meta.set(u.id, { email: u.email ?? "—", phone: (u.user_metadata?.phone as string | undefined) ?? null });
  } catch {
    // service_role yoksa e-postalar görünmez
  }

  const rows: AdminRow[] = ((admins ?? []) as { user_id: string; full_name: string | null; is_owner: boolean; permissions: string[] | null }[]).map((a) => ({
    user_id: a.user_id,
    full_name: a.full_name,
    is_owner: a.is_owner,
    permissions: a.permissions ?? [],
    email: meta.get(a.user_id)?.email ?? "—",
    phone: meta.get(a.user_id)?.phone ?? null,
    isSelf: a.user_id === ctx.userId,
  }));

  return <EkipView rows={rows} />;
}
