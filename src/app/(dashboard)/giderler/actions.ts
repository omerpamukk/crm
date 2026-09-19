"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { expenseSchema, type ExpenseInput } from "./schema";

type ActionResult = { error?: string };

function toRow(values: ExpenseInput) {
  return {
    title: values.title.trim(),
    category: values.category,
    amount: Number(values.amount.replace(",", ".")),
    spent_at: values.spent_at,
    method: values.method,
    note: values.note?.trim() || null,
  };
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("expenses")
    .insert({ business_id: businessId, ...toRow(parsed.data) });

  if (error) return { error: `Gider eklenemedi: ${error.message}` };

  revalidatePath("/giderler");
  revalidatePath("/raporlar");
  return {};
}

export async function updateExpense(
  id: string,
  input: ExpenseInput
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("expenses")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Gider güncellenemedi: ${error.message}` };

  revalidatePath("/giderler");
  revalidatePath("/raporlar");
  return {};
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return { error: `Gider silinemedi: ${error.message}` };

  revalidatePath("/giderler");
  revalidatePath("/raporlar");
  return {};
}
