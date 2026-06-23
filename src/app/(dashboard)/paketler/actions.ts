"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { packageSchema, type PackageInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: PackageInput) {
  const price = values.price ? Number(values.price.replace(",", ".")) : null;
  const paid = values.paid_amount
    ? Number(values.paid_amount.replace(",", "."))
    : 0;

  // payment_status verilmemişse paid/price oranından otomatik belirle.
  let status = values.payment_status?.trim();
  if (!status || !["odendi", "kismi", "odenmedi"].includes(status)) {
    if (price != null && price > 0) {
      if (paid >= price) status = "odendi";
      else if (paid > 0) status = "kismi";
      else status = "odenmedi";
    } else {
      status = paid > 0 ? "odendi" : "odenmedi";
    }
  }

  return {
    customer_id: values.customer_id,
    service_name: values.service_name?.trim() || null,
    total_sessions: values.total_sessions
      ? Number(values.total_sessions)
      : null,
    remaining_sessions: values.remaining_sessions
      ? Number(values.remaining_sessions)
      : null,
    purchased_at: values.purchased_at?.trim() || null,
    price,
    paid_amount: paid,
    payment_status: status,
  };
}

export async function createPackage(input: PackageInput): Promise<ActionResult> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("packages")
    .insert({ business_id: businessId, ...toRow(parsed.data) });

  if (error) return { error: `Paket eklenemedi: ${error.message}` };

  revalidatePath("/paketler");
  return {};
}

export async function updatePackage(
  id: string,
  input: PackageInput
): Promise<ActionResult> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("packages")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) return { error: `Paket güncellenemedi: ${error.message}` };

  revalidatePath("/paketler");
  return {};
}

export async function deletePackage(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("packages").delete().eq("id", id);

  if (error) return { error: `Paket silinemedi: ${error.message}` };

  revalidatePath("/paketler");
  return {};
}
