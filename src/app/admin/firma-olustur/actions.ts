"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProvisionInput {
  businessName: string;
  sector: string;
  fullName: string;
  email: string;
  password?: string;
  plan: string;
}

type Result = { ok: boolean; error?: string; credentials?: { email: string; password: string } };

/** Güçlü rastgele şifre (server tarafında üretilir). */
function genPassword(): string {
  const base = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  // Karmaşıklık için harf-rakam + sembol
  return `Df${base.slice(0, 10)}!${base.slice(10, 12)}`;
}

const DEFAULT_STAGES = [
  { name: "Yeni Lead", color: "#3B82F6", position: 0 },
  { name: "İletişimde", color: "#F59E0B", position: 1 },
  { name: "Randevu Planlandı", color: "#5B5BD6", position: 2 },
  { name: "Kazanıldı", color: "#16A34A", position: 3 },
];

/**
 * Yeni firma + ilk kullanıcı (owner) oluşturur.
 * ⚠️ service_role yalnızca yetki doğrulandıktan SONRA kullanılır.
 */
export async function provisionBusiness(input: ProvisionInput): Promise<Result> {
  // 1) Yetki: çağıran gerçekten süper-admin mi?
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) return { ok: false, error: "Bu işlem için yetkiniz yok." };

  // 2) Doğrulama
  const businessName = input.businessName.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!businessName) return { ok: false, error: "Firma adı zorunludur." };
  if (!fullName) return { ok: false, error: "Kullanıcı adı zorunludur." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Geçerli bir e-posta girin." };
  const password = input.password?.trim() || genPassword();
  if (password.length < 8) return { ok: false, error: "Şifre en az 8 karakter olmalı." };

  const admin = createAdminClient();

  // 3) Auth kullanıcısı (e-posta onaylı)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (cErr || !created?.user) {
    const msg = cErr?.message?.toLowerCase().includes("already")
      ? "Bu e-posta zaten kayıtlı."
      : cErr?.message ?? "Kullanıcı oluşturulamadı.";
    return { ok: false, error: msg };
  }
  const newUserId = created.user.id;

  // 4) Firma
  const { data: biz, error: bErr } = await admin
    .from("businesses")
    .insert({ name: businessName, sector: input.sector || null })
    .select("id")
    .single();
  if (bErr || !biz) {
    await admin.auth.admin.deleteUser(newUserId); // geri al
    return { ok: false, error: `Firma oluşturulamadı: ${bErr?.message ?? ""}` };
  }
  const businessId = biz.id as string;

  // 5) Profil (trigger oluşturmuş olabilir) → business_id + role owner
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: newUserId, business_id: businessId, role: "owner", full_name: fullName }, { onConflict: "id" });
  if (pErr) {
    await admin.from("businesses").delete().eq("id", businessId);
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, error: `Profil bağlanamadı: ${pErr.message}` };
  }

  // 6) Abonelik
  await admin
    .from("subscriptions")
    .upsert({ business_id: businessId, plan: input.plan || "trial", status: "active" }, { onConflict: "business_id" });

  // 7) Varsayılan pipeline sütunları
  await admin.from("pipeline_stages").insert(DEFAULT_STAGES.map((s) => ({ ...s, business_id: businessId })));

  revalidatePath("/admin");
  return { ok: true, credentials: { email, password } };
}
