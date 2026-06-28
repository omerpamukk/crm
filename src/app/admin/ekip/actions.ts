"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOwner } from "@/lib/supabase/admin-context";

type Result = { ok: boolean; error?: string; password?: string; credentials?: { email: string; password: string } };

function genPassword(): string {
  const base = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2);
  return `Df${base.slice(0, 10)}!${base.slice(10, 12)}`;
}

/** Hedef admin kurucu mu? (kurucular üzerinde işlem yasak) */
async function targetIsOwner(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from("platform_admins").select("is_owner").eq("user_id", userId).maybeSingle();
  return !!(data as { is_owner: boolean } | null)?.is_owner;
}

export async function addAdmin(input: { fullName: string; email: string; phone?: string; password?: string; perms: string[] }): Promise<Result> {
  const err = await assertOwner();
  if (err) return { ok: false, error: err };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "Ad Soyad zorunludur." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Geçerli e-posta girin." };
  const password = input.password?.trim() || genPassword();
  if (password.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };

  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName, phone: input.phone?.trim() || null },
  });
  if (cErr || !created?.user) {
    return { ok: false, error: cErr?.message?.toLowerCase().includes("already") ? "Bu e-posta zaten kayıtlı." : (cErr?.message ?? "Kullanıcı oluşturulamadı.") };
  }
  const { error: aErr } = await admin.from("platform_admins").upsert({
    user_id: created.user.id, full_name: fullName, is_owner: false, permissions: input.perms ?? [], created_by: me?.id ?? null,
  }, { onConflict: "user_id" });
  if (aErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Admin kaydı oluşturulamadı: ${aErr.message}` };
  }
  revalidatePath("/admin/ekip");
  return { ok: true, credentials: { email, password } };
}

export async function updateAdminPerms(userId: string, perms: string[]): Promise<Result> {
  const err = await assertOwner();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  if (await targetIsOwner(admin, userId)) return { ok: false, error: "Kurucu yöneticinin yetkileri düzenlenemez." };
  const { error } = await admin.from("platform_admins").update({ permissions: perms }).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ekip");
  return { ok: true };
}

export async function resetAdminPassword(userId: string, customPassword?: string): Promise<Result> {
  const err = await assertOwner();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  if (await targetIsOwner(admin, userId)) return { ok: false, error: "Kurucu yöneticinin şifresi buradan değiştirilemez." };
  const password = customPassword?.trim() || genPassword();
  if (password.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ekip");
  return { ok: true, password };
}

/** Admin kendi profilini düzenler (ad + şifre). Yalnızca kendisi için. */
export async function updateOwnProfile(input: { fullName?: string; password?: string }): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) return { ok: false, error: "Yetkiniz yok." };

  const admin = createAdminClient();
  const fullName = input.fullName?.trim();
  const password = input.password?.trim();
  if (fullName) {
    await admin.from("platform_admins").update({ full_name: fullName }).eq("user_id", user.id);
    await admin.auth.admin.updateUserById(user.id, { user_metadata: { full_name: fullName } });
  }
  if (password) {
    if (password.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/ekip");
  return { ok: true };
}

export async function removeAdmin(userId: string): Promise<Result> {
  const err = await assertOwner();
  if (err) return { ok: false, error: err };
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();
  if (me?.id === userId) return { ok: false, error: "Kendinizi silemezsiniz." };
  const admin = createAdminClient();
  if (await targetIsOwner(admin, userId)) return { ok: false, error: "Kurucu yönetici silinemez." };
  const { error } = await admin.auth.admin.deleteUser(userId); // platform_admins cascade
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/ekip");
  return { ok: true };
}
