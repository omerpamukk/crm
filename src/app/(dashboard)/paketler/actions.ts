"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { packageSchema, type PackageInput } from "./schema";

type ActionResult = { error?: string };

function toNumber(v: string | undefined): number | null {
  return v ? Number(v.replace(",", ".")) : null;
}

function statusOf(price: number | null, paid: number): string {
  if (price != null && price > 0) {
    if (paid >= price) return "odendi";
    if (paid > 0) return "kismi";
    return "odenmedi";
  }
  return paid > 0 ? "odendi" : "odenmedi";
}

/**
 * Ödenen tutar (paid_amount) ve durum bu formdan DOĞRUDAN yazılmaz: ödeme
 * kayıtlarından (payments) gelir. Veritabanı tetikleyicisi (0003) pakete bağlı
 * her ödemede paid_amount ve payment_status'u günceller. Böylece borç her
 * ekranda aynı çıkar (bkz. src/lib/balances.ts) ve tahsilat toplamı eksiksiz olur.
 */
function toRow(values: PackageInput) {
  return {
    customer_id: values.customer_id,
    service_name: values.service_name?.trim() || null,
    total_sessions: values.total_sessions ? Number(values.total_sessions) : null,
    remaining_sessions: values.remaining_sessions ? Number(values.remaining_sessions) : null,
    purchased_at: values.purchased_at?.trim() || null,
    price: toNumber(values.price),
  };
}

function revalidateAll() {
  revalidatePath("/paketler");
  revalidatePath("/tahsilat");
  revalidatePath("/cari");
  revalidatePath("/panel");
  revalidatePath("/musteriler");
}

export async function createPackage(input: PackageInput): Promise<ActionResult> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const supabase = await createClient();
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId, userId } = auth;

  const row = toRow(parsed.data);
  const upfront = toNumber(parsed.data.paid_amount) ?? 0;
  if (row.price != null && upfront > row.price) {
    return { error: "Peşin ödenen tutar paket fiyatından büyük olamaz." };
  }

  // Müşteri bu işletmeye ait mi?
  const { data: cust } = await supabase
    .from("customers")
    .select("id")
    .eq("id", row.customer_id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!cust) return { error: "Müşteri bulunamadı. Listeyi yenileyip tekrar seçin." };

  const { data: created, error } = await supabase
    .from("packages")
    .insert({ business_id: businessId, ...row, paid_amount: 0, payment_status: "odenmedi" })
    .select("id")
    .single();

  if (error || !created) {
    console.error("createPackage:", error);
    return { error: "Paket satılamadı. Tekrar deneyin." };
  }

  if (upfront > 0) {
    const { error: payError } = await supabase.from("payments").insert({
      business_id: businessId,
      customer_id: row.customer_id,
      amount: upfront,
      method: "nakit",
      related_type: "paket",
      related_id: created.id,
      note: "Peşin ödeme",
      created_by: userId,
    });
    if (payError) {
      console.error("createPackage/payment:", payError);
      // Yarım kalmasın: ödeme yazılamadıysa paketi geri al.
      await supabase.from("packages").delete().eq("id", created.id).eq("business_id", businessId);
      return { error: "Paket satılamadı, peşin ödeme kaydedilemedi. Tekrar deneyin." };
    }
  }

  revalidateAll();
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
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId, userId } = auth;

  const { data: existing } = await supabase
    .from("packages")
    .select("id, customer_id, paid_amount")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!existing) return { error: "Paket bulunamadı. Listeyi yenileyip tekrar deneyin." };

  const row = toRow(parsed.data);
  const currentPaid = Number(existing.paid_amount ?? 0);
  const wantedPaid = toNumber(parsed.data.paid_amount) ?? 0;
  const extra = Math.round((wantedPaid - currentPaid) * 100) / 100;

  if (extra < 0) {
    return { error: "Alınan ödeme azaltılamaz. Ödeme kayıtları geçmişi korur; tutarı değiştirmeyin." };
  }
  if (row.price != null && wantedPaid > row.price) {
    return { error: "Ödenen tutar paket fiyatından büyük olamaz." };
  }

  const { error } = await supabase
    .from("packages")
    .update({ ...row, payment_status: statusOf(row.price, currentPaid) })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("updatePackage:", error);
    return { error: "Paket güncellenemedi. Tekrar deneyin." };
  }

  // Formda ödenen tutar artırıldıysa, artış bir ödeme kaydı olur (tetikleyici paid_amount'u günceller).
  if (extra > 0) {
    const { error: payError } = await supabase.from("payments").insert({
      business_id: businessId,
      customer_id: existing.customer_id,
      amount: extra,
      method: "nakit",
      related_type: "paket",
      related_id: id,
      note: "Paket düzenlemesinden eklenen ödeme",
      created_by: userId,
    });
    if (payError) {
      console.error("updatePackage/payment:", payError);
      return { error: "Paket güncellendi ama yeni ödeme kaydedilemedi. Ödemeyi Satışlar sayfasından ekleyin." };
    }
  }

  revalidateAll();
  return {};
}

export async function deletePackage(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await authorize(supabase, "tahsilat");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { error } = await supabase
    .from("packages")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("deletePackage:", error);
    return { error: "Paket silinemedi. Tekrar deneyin." };
  }

  revalidateAll();
  return {};
}
