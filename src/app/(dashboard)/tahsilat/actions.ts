"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
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
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const hasPackage = !!values.package_id && values.package_id !== NONE;

  // Müşteri ve paket bu işletmeye ait olmalı (tetikleyici paketi yalnızca id ile günceller).
  const { data: cust } = await supabase
    .from("customers")
    .select("id")
    .eq("id", values.customer_id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!cust) return { error: "Müşteri bulunamadı. Listeyi yenileyip tekrar seçin." };

  if (hasPackage) {
    const { data: pkg } = await supabase
      .from("packages")
      .select("id")
      .eq("id", values.package_id as string)
      .eq("customer_id", values.customer_id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!pkg) return { error: "Bu müşteriye ait paket bulunamadı. Paketi yeniden seçin." };
  }

  const { error } = await supabase.from("payments").insert({
    business_id: businessId,
    customer_id: values.customer_id,
    amount: Number(values.amount.replace(",", ".")),
    method: values.method?.trim() || "nakit",
    related_type: hasPackage ? "paket" : null,
    related_id: hasPackage ? values.package_id : null,
    note: values.note?.trim() || null,
    created_by: auth.userId,
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
  revalidatePath("/cari");
  revalidatePath("/musteriler");
  return {};
}
