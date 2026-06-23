"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { logInteraction } from "@/lib/supabase/interactions";

export async function addCustomerNote(
  customerId: string,
  note: string
): Promise<{ error?: string }> {
  const trimmed = note.trim();
  if (!trimmed) return { error: "Not boş olamaz." };

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logInteraction(supabase, {
    businessId,
    customerId,
    type: "not",
    note: trimmed,
    createdBy: user?.id ?? null,
  });

  revalidatePath("/musteriler");
  revalidatePath("/leadler");
  return {};
}
