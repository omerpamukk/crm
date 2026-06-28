"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: boolean; error?: string; password?: string; credentials?: { email: string; password: string } };

/** Her yazma işleminden önce: çağıran süper-admin mi? */
async function assertSuperAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Oturum bulunamadı.";
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) return "Bu işlem için yetkiniz yok.";
  return null;
}

function genPassword(): string {
  const base = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2);
  return `Df${base.slice(0, 10)}!${base.slice(10, 12)}`;
}

export async function updateBusiness(id: string, name: string, sector: string): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  if (!name.trim()) return { ok: false, error: "Firma adı zorunludur." };
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ name: name.trim(), sector: sector || null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/firma/${id}`);
  return { ok: true };
}

export async function updateSubscription(
  businessId: string,
  patch: { plan: string; status: string; price: number; expires_at: string | null }
): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({ plan: patch.plan, status: patch.status, price: patch.price, expires_at: patch.expires_at, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

export async function setSubscriptionStatus(businessId: string, status: "active" | "suspended"): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("business_id", businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

export async function addUserToBusiness(
  businessId: string,
  input: { fullName: string; email: string; password?: string; role: string }
): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "Ad Soyad zorunludur." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Geçerli e-posta girin." };
  const password = input.password?.trim() || genPassword();

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (cErr || !created?.user) {
    return { ok: false, error: cErr?.message?.toLowerCase().includes("already") ? "Bu e-posta zaten kayıtlı." : (cErr?.message ?? "Kullanıcı oluşturulamadı.") };
  }
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: created.user.id, business_id: businessId, role: input.role === "staff" ? "staff" : "owner", full_name: fullName }, { onConflict: "id" });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Profil bağlanamadı: ${pErr.message}` };
  }
  revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true, credentials: { email, password } };
}

export async function changeUserRole(businessId: string, userId: string, role: "owner" | "staff"): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

export async function resetUserPassword(businessId: string, userId: string): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  const password = genPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true, password };
}

export async function removeUser(businessId: string, userId: string): Promise<Result> {
  const err = await assertSuperAdmin();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  // profiles.id → auth.users on delete cascade; auth kullanıcısını silmek profili de siler
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}
