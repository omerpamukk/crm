"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, ACTING_COOKIE } from "@/lib/supabase/server";

/** Süper-admin bir firmayı salt-okunur "görüntüleyici" olarak gezmeye başlar. */
export async function enterViewAs(businessId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) redirect("/panel");

  const c = await cookies();
  c.set(ACTING_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 saat
  });
  redirect("/panel");
}

/** Görüntüleyici modundan çıkar, admin paneline döner. */
export async function exitViewAs() {
  const c = await cookies();
  c.delete(ACTING_COOKIE);
  redirect("/admin");
}
