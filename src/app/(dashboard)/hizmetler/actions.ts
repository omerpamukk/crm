"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { serviceSchema, type ServiceInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: ServiceInput) {
  return {
    name: values.name.trim(),
    category: values.category?.trim() || null,
    duration_min: values.duration_min ? Number(values.duration_min) : null,
    price: values.price ? Number(values.price.replace(",", ".")) : null,
  };
}

function revalidateAll() {
  revalidatePath("/hizmetler");
  revalidatePath("/randevular");
  revalidatePath("/takvim");
}

export async function createService(input: ServiceInput): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("services")
    .insert({ business_id: auth.businessId, ...toRow(parsed.data) });

  if (error) {
    console.error("createService:", error);
    return { error: "Hizmet eklenemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function updateService(id: string, input: ServiceInput): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("services")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) {
    console.error("updateService:", error);
    return { error: "Hizmet güncellenemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function deleteService(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "randevu_yonet");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) {
    console.error("deleteService:", error);
    if (error.code === "23503") return { error: "Bu hizmet randevularda kullanıldığı için silinemez." };
    return { error: "Hizmet silinemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}
