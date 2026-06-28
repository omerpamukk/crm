"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTING_COOKIE, ACTING_MODE_COOKIE } from "@/lib/supabase/server";
import { assertPerm } from "@/lib/supabase/admin-context";

export type ActingMode = "view" | "manage";

/** Süper-admin bir firmayı görüntüleyici (view) veya yönetici (manage) olarak gezer. */
export async function enterViewAs(businessId: string, mode: ActingMode = "view") {
  // view → "goruntule", manage → "yonet" yetkisi gerekir
  const err = await assertPerm(mode === "manage" ? "yonet" : "goruntule");
  if (err) redirect("/admin");

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
