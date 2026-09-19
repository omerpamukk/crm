"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { logBusinessAction } from "@/lib/supabase/business-audit";
import {
  productSchema,
  movementSchema,
  type ProductInput,
  type MovementInput,
} from "./schema";

type ActionResult = { error?: string };

const num = (v?: string) => (v ? Number(v.replace(",", ".")) : 0);
const numOrNull = (v?: string) => (v ? Number(v.replace(",", ".")) : null);

function toRow(values: ProductInput) {
  return {
    name: values.name.trim(),
    sku: values.sku?.trim() || null,
    category: values.category?.trim() || null,
    unit: values.unit,
    critical_level: num(values.critical_level),
    cost_price: numOrNull(values.cost_price),
    sale_price: numOrNull(values.sale_price),
    is_active: values.is_active,
  };
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const startQty = num(parsed.data.stock_qty);

  const { data: created, error } = await supabase
    .from("products")
    .insert({ business_id: businessId, stock_qty: 0, ...toRow(parsed.data) })
    .select("id")
    .single();

  if (error) {
    console.error("createProduct:", error);
    return { error: "Ürün eklenemedi." };
  }

  // Açılış stoğu varsa hareket olarak yaz (trigger miktarı günceller).
  if (startQty > 0 && created) {
    await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: (created as { id: string }).id,
      kind: "in",
      qty: startQty,
      note: "Açılış stoğu",
    });
  }

  revalidatePath("/stok");
  return {};
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("products")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateProduct:", error);
    return { error: "Ürün güncellenemedi." };
  }

  revalidatePath("/stok");
  return {};
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const { data: before } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteProduct:", error);
    return { error: "Ürün silinemedi." };
  }

  await logBusinessAction(supabase, {
    businessId,
    action: "sil",
    entity: "urun",
    entityId: id,
    summary: (before as { name: string } | null)?.name ?? "Ürün",
  });

  revalidatePath("/stok");
  return {};
}

/** Stok hareketi ekler; DB trigger'ı products.stock_qty'yi günceller. */
export async function addMovement(input: MovementInput): Promise<ActionResult> {
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("stock_movements").insert({
    business_id: businessId,
    product_id: parsed.data.product_id,
    kind: parsed.data.kind,
    qty: num(parsed.data.qty),
    note: parsed.data.note?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("addMovement:", error);
    return { error: "Stok hareketi kaydedilemedi." };
  }

  revalidatePath("/stok");
  return {};
}
