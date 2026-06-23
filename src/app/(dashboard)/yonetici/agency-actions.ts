"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";

type ActionResult = { error?: string };

export interface AgencyAccessInput {
  name: string;
  email?: string;
  token: string;
  sections: string[];
  permission: string;
  days: number;
  note?: string;
}

function expiresFromDays(days: number): string | null {
  if (!days || days <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function createAgencyAccess(
  input: AgencyAccessInput
): Promise<ActionResult> {
  if (!input.name.trim()) return { error: "Ajans / kişi adı zorunludur." };
  if (input.sections.length === 0)
    return { error: "En az bir bölüm seçmelisiniz." };
  if (!input.token) return { error: "Geçersiz bağlantı." };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("agency_access").insert({
    business_id: businessId,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    token: input.token,
    sections: input.sections,
    permission: input.permission,
    expires_at: expiresFromDays(input.days),
    note: input.note?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: `Ajans erişimi oluşturulamadı: ${error.message}` };

  revalidatePath("/yonetici");
  return {};
}

export async function revokeAgencyAccess(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_access")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { error: `İşlem başarısız: ${error.message}` };
  revalidatePath("/yonetici");
  return {};
}

export async function renewAgencyAccess(
  id: string,
  days = 90
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_access")
    .update({ is_active: true, expires_at: expiresFromDays(days) })
    .eq("id", id);
  if (error) return { error: `Yenilenemedi: ${error.message}` };
  revalidatePath("/yonetici");
  return {};
}
