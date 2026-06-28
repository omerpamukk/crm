"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, ACTING_COOKIE, ACTING_MODE_COOKIE } from "@/lib/supabase/server";

export type ActingMode = "view" | "manage";

/** Süper-admin bir firmayı görüntüleyici (view) veya yönetici (manage) olarak gezer. */
export async function enterViewAs(businessId: string, mode: ActingMode = "view") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) redirect("/panel");

  const c = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 8 };
  c.set(ACTING_COOKIE, businessId, opts);
  c.set(ACTING_MODE_COOKIE, mode, opts);
  redirect("/panel");
}

/** Görüntüleme/yönetim modundan çıkar, admin paneline döner. */
export async function exitViewAs() {
  const c = await cookies();
  c.delete(ACTING_COOKIE);
  c.delete(ACTING_MODE_COOKIE);
  redirect("/admin");
}
