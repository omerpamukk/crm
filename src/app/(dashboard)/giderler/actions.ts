"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { logBusinessAction } from "@/lib/supabase/business-audit";
import { formatPrice } from "@/lib/format";
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

function revalidateAll() {
  revalidatePath("/giderler");
  revalidatePath("/raporlar");
  revalidatePath("/panel");
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "finans");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("expenses")
    .insert({ business_id: auth.businessId, ...toRow(parsed.data) });

  if (error) {
    console.error("createExpense:", error);
    return { error: "Gider eklenemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "finans");
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("expenses")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) {
    console.error("updateExpense:", error);
    return { error: "Gider güncellenemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "finans");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { data: before } = await supabase
    .from("expenses")
    .select("title, amount")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("business_id", businessId);

  if (error) {
    console.error("deleteExpense:", error);
    return { error: "Gider silinemedi. Tekrar deneyin." };
  }

  const row = before as { title: string; amount: number } | null;
  await logBusinessAction(supabase, {
    businessId,
    action: "sil",
    entity: "gider",
    entityId: id,
    summary: row ? `${row.title} · ${formatPrice(row.amount)}` : "Gider",
  });

  revalidateAll();
  return {};
}
