"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTING_COOKIE, ACTING_MODE_COOKIE, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPerm } from "@/lib/supabase/admin-context";
import { logAdminAction } from "@/lib/supabase/audit";

export type ActingMode = "view" | "manage";

const SESSION_HOURS = 8;

async function clearActingCookies() {
  const c = await cookies();
  c.delete(ACTING_COOKIE);
  c.delete(ACTING_MODE_COOKIE);
}

/** Oturum satırını (service role) siler; hata asıl akışı bozmaz. */
async function clearActingSession(userId: string) {
  try {
    await createAdminClient().from("admin_acting_sessions").delete().eq("user_id", userId);
  } catch (e) {
    console.error("acting oturumu silinemedi", e);
  }
}

/**
 * Admin bir firmayı görüntüleyici (view) veya yönetici (manage) olarak gezer.
 * Yetki kaynağı sunucudaki admin_acting_sessions satırıdır (0026); çerez yalnızca gösterge.
 */
export async function enterViewAs(businessId: string, rawMode: ActingMode = "view") {
  const mode: ActingMode = rawMode === "manage" ? "manage" : "view";
  // view → "goruntule", manage → "yonet" yetkisi sunucuda doğrulanır
  const err = await assertPerm(mode === "manage" ? "yonet" : "goruntule");
  if (err) redirect("/admin");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const admin = createAdminClient();
  const { data: biz } = await admin.from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (!biz) redirect("/admin");

  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { error } = await admin
    .from("admin_acting_sessions")
    .upsert({ user_id: user.id, business_id: businessId, mode, expires_at: expires }, { onConflict: "user_id" });
  if (error) {
    console.error("acting oturumu yazılamadı", error);
    // Layout bu kısa ömürlü çerezi görünce sade bir uyarı gösterir.
    (await cookies()).set("acting_error", "1", { path: "/", maxAge: 10, sameSite: "lax" });
    redirect("/admin");
  }

  if (mode === "manage") await logAdminAction("yonetici_giris", { businessId });

  const c = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * SESSION_HOURS };
  c.set(ACTING_COOKIE, businessId, opts);
  c.set(ACTING_MODE_COOKIE, mode, opts);
  redirect("/panel");
}

/** Görüntüleme/yönetim modundan çıkar, admin paneline döner. */
export async function exitViewAs() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await clearActingSession(user.id);
  await clearActingCookies();
  redirect("/admin");
}

/**
 * Tam çıkış: acting oturumunu ve çerezleri sunucuda temizler, Supabase oturumunu kapatır.
 * Hem admin hem firma çıkış düğmeleri istemcide signOut yerine bunu çağırmalı.
 */
export async function signOutAndClear() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await clearActingSession(user.id);
  await clearActingCookies();
  await supabase.auth.signOut();
  redirect("/giris");
}
