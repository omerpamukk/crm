"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
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
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const startQty = num(parsed.data.stock_qty);

  const { data: created, error } = await supabase
    .from("products")
    .insert({ business_id: businessId, stock_qty: 0, ...toRow(parsed.data) })
    .select("id")
    .single();

  if (error) {
    console.error("createProduct:", error);
    if (error.code === "23505") return { error: "Bu kod başka bir üründe kullanılıyor. Farklı bir kod girin." };
    return { error: "Ürün eklenemedi. Tekrar deneyin." };
  }

  // Açılış stoğu varsa hareket olarak yaz (trigger miktarı günceller).
  if (startQty > 0 && created) {
    const { error: movError } = await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: (created as { id: string }).id,
      kind: "in",
      qty: startQty,
      note: "Açılış stoğu",
      created_by: auth.userId,
    });
    if (movError) {
      console.error("createProduct/movement:", movError);
      revalidatePath("/stok");
      return { error: "Ürün eklendi ama açılış stoğu yazılamadı. Ürünün satırından stok girişi yapın." };
    }
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
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { error } = await supabase
    .from("products")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updateProduct:", error);
    if (error.code === "23505") return { error: "Bu kod başka bir üründe kullanılıyor. Farklı bir kod girin." };
    return { error: "Ürün güncellenemedi. Tekrar deneyin." };
  }

  revalidatePath("/stok");
  return {};
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { data: before } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deleteProduct:", error);
    return { error: "Ürün silinemedi. Tekrar deneyin." };
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
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId, userId } = auth;

  // Ürün bu işletmeye ait mi? Çıkış eldeki stoktan fazla olamaz.
  const { data: product } = await supabase
    .from("products")
    .select("stock_qty")
    .eq("id", parsed.data.product_id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!product) return { error: "Ürün bulunamadı. Listeyi yenileyip tekrar deneyin." };

  const qty = num(parsed.data.qty);
  if (qty <= 0) return { error: "Miktar sıfırdan büyük olmalı." };
  if (
    (parsed.data.kind === "out" || parsed.data.kind === "consume") &&
    qty > Number((product as { stock_qty: number }).stock_qty)
  ) {
    return { error: "Çıkış miktarı eldeki stoktan fazla olamaz." };
  }

  const { error } = await supabase.from("stock_movements").insert({
    business_id: businessId,
    product_id: parsed.data.product_id,
    kind: parsed.data.kind,
    qty,
    note: parsed.data.note?.trim() || null,
    created_by: userId,
  });

  if (error) {
    console.error("addMovement:", error);
    return { error: "Stok hareketi kaydedilemedi. Tekrar deneyin." };
  }

  revalidatePath("/stok");
  return {};
}
