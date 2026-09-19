"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { logBusinessAction } from "@/lib/supabase/business-audit";
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

  if (error) {
    console.error("createPayment:", error);
    return { error: "Ödeme kaydedilemedi." };
  }

  const amount = Number(values.amount.replace(",", "."));
  await logBusinessAction(supabase, {
    businessId,
    action: "ekle",
    entity: "odeme",
    summary: `${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)} · ${values.method?.trim() || "nakit"}`,
    detail: { customer_id: values.customer_id, package_id: hasPackage ? values.package_id : null },
  });

  // Pakete bağlıysa DB trigger paid_amount/payment_status'u günceller.
  revalidatePath("/tahsilat");
  revalidatePath("/paketler");
  revalidatePath("/panel");
  return {};
}
