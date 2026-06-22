import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface AccountContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  businessId: string;
  businessName: string;
}

/**
 * Giriş yapmış kullanıcının profil + işletme bağlamını döndürür.
 * Oturum yoksa /giris'e, işletmesi yoksa /isletme-kur'a yönlendirir.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_id, businesses(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    redirect("/isletme-kur");
  }

  const business = (
    Array.isArray(profile.businesses)
      ? profile.businesses[0]
      : profile.businesses
  ) as { name: string } | null;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    businessId: profile.business_id,
    businessName: business?.name ?? "İşletmen",
  };
}
