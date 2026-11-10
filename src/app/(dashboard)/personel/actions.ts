"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { staffSchema, type StaffInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: StaffInput) {
  return {
    full_name: values.full_name.trim(),
    title: values.title?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    commission_rate: values.commission_rate ? Number(values.commission_rate.replace(",", ".")) : 0,
    is_active: values.is_active,
    note: values.note?.trim() || null,
  };
}

function revalidateAll() {
  revalidatePath("/personel");
  revalidatePath("/randevular");
  revalidatePath("/takvim");
}

export async function createStaff(input: StaffInput): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "personel_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("staff").insert({ business_id: auth.businessId, ...toRow(parsed.data) });

  if (error) {
    console.error("createStaff:", error);
    return { error: "Personel eklenemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function updateStaff(id: string, input: StaffInput): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "personel_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("staff")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) {
    console.error("updateStaff:", error);
    return { error: "Personel güncellenemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "personel_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase.from("staff").delete().eq("id", id).eq("business_id", auth.businessId);

  if (error) {
    console.error("deleteStaff:", error);
    if (error.code === "23503") {
      return { error: "Randevusu olan personel silinemez. Silmek yerine pasife alın." };
    }
    return { error: "Personel silinemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}
