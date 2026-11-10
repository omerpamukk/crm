"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";

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
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function check(input: { name: string; sections: string[] }): string | null {
  if (!input.name.trim()) return "Ajans ya da kişi adı zorunludur.";
  if (input.sections.length === 0) return "En az bir bölüm seçin.";
  return null;
}

export async function createAgencyAccess(input: AgencyAccessInput): Promise<ActionResult> {
  const problem = check(input);
  if (problem) return { error: problem };
  if (!/^[A-Za-z0-9]{16,64}$/.test(input.token)) return { error: "Bağlantı oluşturulamadı. Tekrar deneyin." };

  const supabase = await createClient();
  const auth = await authorize(supabase, "raporlar");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("agency_access").insert({
    business_id: auth.businessId,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    token: input.token,
    sections: input.sections,
    permission: input.permission,
    expires_at: expiresFromDays(input.days),
    note: input.note?.trim() || null,
    created_by: auth.userId,
  });

  if (error) {
    console.error("createAgencyAccess:", error);
    return { error: "Erişim verilemedi. Tekrar deneyin." };
  }

  revalidatePath("/raporlar");
  return {};
}

export interface AgencyUpdateInput {
  name: string;
  email?: string;
  sections: string[];
  note?: string;
  days?: number;
  keepDuration?: boolean;
}

export async function updateAgencyAccess(id: string, input: AgencyUpdateInput): Promise<ActionResult> {
  const problem = check(input);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const auth = await authorize(supabase, "raporlar");
  if ("error" in auth) return { error: auth.error };

  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email?.trim() || null,
    sections: input.sections,
    note: input.note?.trim() || null,
  };
  // Süre değiştirilmek istenmişse yeni bitiş tarihi uygula; aksi halde dokunma.
  if (!input.keepDuration) {
    patch.expires_at = expiresFromDays(input.days ?? 0);
    patch.is_active = true;
  }

  const { error } = await supabase
    .from("agency_access")
    .update(patch)
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) {
    console.error("updateAgencyAccess:", error);
    return { error: "Erişim güncellenemedi. Tekrar deneyin." };
  }

  revalidatePath("/raporlar");
  return {};
}

export async function deleteAgencyAccess(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "raporlar");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("agency_access").delete().eq("id", id).eq("business_id", auth.businessId);

  if (error) {
    console.error("deleteAgencyAccess:", error);
    return { error: "Erişim silinemedi. Tekrar deneyin." };
  }

  revalidatePath("/raporlar");
  return {};
}
