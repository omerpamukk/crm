import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, ACTING_COOKIE, ACTING_MODE_COOKIE } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AccountContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  businessId: string;
  businessName: string;
  role: UserRole;
  roleLabel: string;
  /** Süper-admin bu firmayı görüntülüyor/yönetiyor mu? */
  impersonating: boolean;
  /** Impersonation "yönet" modunda mı? (yazma açık) */
  manageMode: boolean;
}

/**
 * Giriş yapmış kullanıcının profil + işletme bağlamını döndürür.
 * Oturum yoksa /giris'e; süper-admin /admin'e; işletmesi yoksa /hesap-yok'a;
 * aboneliği askıdaysa /askida'ya yönlendirir.
 * Dashboard server component'lerinde kullanılır.
 */
export async function getAccountContext(): Promise<AccountContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/giris");
  }

  // Süper-admin: bir firmayı "görüntüleyici" geziyorsa o firmanın bağlamını
  // döndür (salt-okunur); aksi halde /admin'e gider.
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (isAdmin) {
    const cookieStore = await cookies();
    const acting = cookieStore.get(ACTING_COOKIE)?.value;
    if (!acting) {
      redirect("/admin");
    }
    const manageMode = cookieStore.get(ACTING_MODE_COOKIE)?.value === "manage";
    // Başlık sayesinde bu okuma yalnızca acting firmayı döndürür.
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", acting)
      .maybeSingle();
    if (!biz) {
      redirect("/admin");
    }
    return {
      userId: user.id,
      email: user.email ?? null,
      fullName: user.email ?? null,
      businessId: acting,
      businessName: (biz as { name: string }).name,
      role: "owner",
      roleLabel: manageMode ? "Yönetici (Ajans)" : "Görüntüleyici",
      impersonating: true,
      manageMode,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_id, role, businesses(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    redirect("/hesap-yok");
  }

  // Abonelik askıda/iptal/süresi-dolmuş ise firma paneline erişilemez.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("business_id", profile.business_id)
    .maybeSingle();
  const s = sub as { status: string; expires_at: string | null } | null;
  const expired = !!s?.expires_at && new Date(s.expires_at).getTime() < Date.now();
  if (s?.status === "suspended" || s?.status === "cancelled" || expired) {
    redirect("/askida");
  }

  const business = (
    Array.isArray(profile.businesses)
      ? profile.businesses[0]
      : profile.businesses
  ) as { name: string } | null;

  const role = (profile.role as UserRole) ?? "owner";

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    businessId: profile.business_id,
    businessName: business?.name ?? "İşletmen",
    role,
    roleLabel: role === "owner" ? "Yönetici" : "Personel",
    impersonating: false,
    manageMode: false,
  };
}
