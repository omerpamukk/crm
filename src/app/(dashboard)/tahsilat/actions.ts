"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { paymentSchema, NONE, type PaymentInput } from "./schema";

type ActionResult = { error?: string };

export async function createPayment(input: PaymentInput): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  const values = parsed.data;

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasPackage = !!values.package_id && values.package_id !== NONE;

  const { error } = await supabase.from("payments").insert({
    business_id: businessId,
    customer_id: values.customer_id,
    amount: Number(values.amount.replace(",", ".")),
    method: values.method?.trim() || "nakit",
    related_type: hasPackage ? "paket" : null,
    related_id: hasPackage ? values.package_id : null,
    note: values.note?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: `Ödeme kaydedilemedi: ${error.message}` };

  // Pakete bağlıysa DB trigger paid_amount/payment_status'u günceller.
  revalidatePath("/tahsilat");
  revalidatePath("/paketler");
  revalidatePath("/panel");
  return {};
}
