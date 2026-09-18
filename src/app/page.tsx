import { redirect, unstable_rethrow } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Kök giriş kapısı. Kendi içeriği yoktur; oturum durumuna göre yönlendirir:
 *   oturum yok      → /giris
 *   süper-admin     → /admin
 *   normal kullanıcı → /panel
 * (Hesabı/aboneliği ile ilgili durumları /panel tarafındaki
 * getAccountContext ele alır — /hesap-yok, /askida.)
 */
export default async function RootPage() {
  // Oturum/ağ hatasında hata sayfası yerine girişe düş (middleware ile aynı davranış).
  let isAdmin = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/giris");
    }
    const { data } = await supabase.rpc("is_super_admin");
    isAdmin = Boolean(data);
  } catch (error) {
    // redirect() içeride NEXT_REDIRECT fırlatır; framework hatalarını yutma.
    unstable_rethrow(error);
    redirect("/giris");
  }

  redirect(isAdmin ? "/admin" : "/panel");
}
