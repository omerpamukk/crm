"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertPerm, assertOwner } from "@/lib/supabase/admin-context";
import { logAdminAction } from "@/lib/supabase/audit";
import type { UserRole } from "@/types/database";

type Result = { ok: boolean; error?: string; password?: string; credentials?: { email: string; password: string } };

/** Serbest metni geçerli bir role indirger; bilinmeyen değer en kısıtlı role düşer. */
function normalizeRole(role: string): UserRole {
  return role === "owner" || role === "specialist" ? role : "reception";
}

function genPassword(): string {
  const base = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2);
  return `Df${base.slice(0, 10)}!${base.slice(10, 12)}`;
}

export interface BusinessInfoPatch {
  name: string;
  sector: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  timezone: string;
  slug: string;
  logo_url: string;
}

export async function updateBusinessInfo(id: string, patch: BusinessInfoPatch): Promise<Result> {
  const err = await assertPerm("firma_duzenle");
  if (err) return { ok: false, error: err };
  if (!patch.name.trim()) return { ok: false, error: "Firma adı zorunludur." };
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({
    name: patch.name.trim(),
    sector: patch.sector || null,
    phone: patch.phone.trim() || null,
    email: patch.email.trim() || null,
    address: patch.address.trim() || null,
    currency: patch.currency || "TRY",
    timezone: patch.timezone || "Europe/Istanbul",
    slug: patch.slug.trim() || null,
    logo_url: patch.logo_url.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message.includes("slug") ? "Bu web adresi (slug) başka firmada kullanılıyor." : error.message };
await logAdminAction("firma_duzenle", { businessId: id, businessName: patch.name });
    revalidatePath(`/admin/firma/${id}`);
  return { ok: true };
}

export interface SubscriptionPatch {
  plan: string;
  status: string;
  price: number;
  started_at: string | null;
  expires_at: string | null;
  note: string;
}

export async function updateSubscription(businessId: string, patch: SubscriptionPatch): Promise<Result> {
  const err = await assertPerm("abonelik");
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").update({
    plan: patch.plan,
    status: patch.status,
    price: patch.price,
    started_at: patch.started_at || undefined,
    expires_at: patch.expires_at,
    note: patch.note.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("business_id", businessId);
  if (error) return { ok: false, error: error.message };
await logAdminAction("abonelik_guncelle", { businessId, detail: `${patch.plan} · ${patch.status}` });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

export async function setSubscriptionStatus(businessId: string, status: "active" | "suspended"): Promise<Result> {
  const err = await assertPerm("abonelik");
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("business_id", businessId);
  if (error) return { ok: false, error: error.message };
await logAdminAction(status === "suspended" ? "abonelik_askiya" : "abonelik_aktive", { businessId });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

export async function addUserToBusiness(
  businessId: string,
  input: { fullName: string; email: string; phone?: string; password?: string; role: string }
): Promise<Result> {
  const err = await assertPerm("kullanici_yonet");
  if (err) return { ok: false, error: err };
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "Ad Soyad zorunludur." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Geçerli e-posta girin." };
  const password = input.password?.trim() || genPassword();
  if (password.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, phone: input.phone?.trim() || null },
  });
  if (cErr || !created?.user) {
    return { ok: false, error: cErr?.message?.toLowerCase().includes("already") ? "Bu e-posta zaten kayıtlı." : (cErr?.message ?? "Kullanıcı oluşturulamadı.") };
  }
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: created.user.id, business_id: businessId, role: normalizeRole(input.role), full_name: fullName }, { onConflict: "id" });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Profil bağlanamadı: ${pErr.message}` };
  }
await logAdminAction("kullanici_ekle", { businessId, detail: email });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true, credentials: { email, password } };
}

export async function changeUserRole(businessId: string, userId: string, role: UserRole): Promise<Result> {
  const err = await assertPerm("kullanici_yonet");
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
await logAdminAction("kullanici_rol", { businessId, detail: role });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

export async function resetUserPassword(businessId: string, userId: string, customPassword?: string): Promise<Result> {
  const err = await assertPerm("kullanici_yonet");
  if (err) return { ok: false, error: err };
  const password = customPassword?.trim() || genPassword();
  if (password.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };
await logAdminAction("kullanici_sifre", { businessId });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true, password };
}

export async function setUserActive(businessId: string, userId: string, active: boolean): Promise<Result> {
  const err = await assertPerm("kullanici_yonet");
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  // ban_duration ile pasifleştir (giriş engellenir) / "none" ile aktive et
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876600h" });
  if (error) return { ok: false, error: error.message };
await logAdminAction(active ? "kullanici_aktive" : "kullanici_pasif", { businessId });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}

/**
 * Firmayı kalıcı olarak siler — YALNIZCA KURUCU. Tüm firma verisi (cascade) +
 * firmanın kullanıcı (auth) hesapları silinir. Geri alınamaz.
 */
export async function deleteBusiness(id: string): Promise<Result> {
  const err = await assertOwner();
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();

  const { data: biz } = await admin.from("businesses").select("name").eq("id", id).maybeSingle();
  const { data: profs } = await admin.from("profiles").select("id").eq("business_id", id);
  const userIds = ((profs ?? []) as { id: string }[]).map((p) => p.id);

  // 1) Firma satırını sil → bağlı tüm veriler cascade ile gider (0013 sonrası)
  const { error: delErr } = await admin.from("businesses").delete().eq("id", id);
  if (delErr) return { ok: false, error: `Firma silinemedi: ${delErr.message}` };

  // 2) Artık profili kalmayan auth kullanıcılarını sil (giriş yapamasınlar)
  for (const uid of userIds) {
    try { await admin.auth.admin.deleteUser(uid); } catch { /* yoksay */ }
  }

  await logAdminAction("firma_sil", { businessName: (biz as { name: string } | null)?.name ?? null, detail: `${userIds.length} kullanıcı silindi` });
  revalidatePath("/admin");
  return { ok: true };
}

export async function removeUser(businessId: string, userId: string): Promise<Result> {
  const err = await assertPerm("kullanici_yonet");
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
await logAdminAction("kullanici_sil", { businessId });
    revalidatePath(`/admin/firma/${businessId}`);
  return { ok: true };
}
