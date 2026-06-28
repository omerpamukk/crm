import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AccountContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  businessId: string;
  businessName: string;
  role: UserRole;
  roleLabel: string;
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

  // Süper-admin firma paneline değil, /admin'e gider.
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (isAdmin) {
    redirect("/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_id, role, businesses(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    redirect("/hesap-yok");
  }

  // Abonelik askıda/iptal ise firma paneline erişilemez.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("business_id", profile.business_id)
    .maybeSingle();
  if (sub?.status === "suspended" || sub?.status === "cancelled") {
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
  };
}
