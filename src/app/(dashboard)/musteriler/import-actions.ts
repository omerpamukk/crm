"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/supabase/authorize";
import { logBusinessAction } from "@/lib/supabase/business-audit";
import { normalizePhone } from "@/lib/messaging/sms";
import { MAX_IMPORT } from "@/lib/customer-import";

const rowSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().regex(/^90\d{10}$/).nullable(),
  email: z.string().email().max(200).nullable(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  note: z.string().max(500).nullable(),
  consent: z.boolean(),
});

const inputSchema = z.object({
  rows: z.array(rowSchema).min(1, "Eklenecek satır yok.").max(MAX_IMPORT, `Tek seferde en fazla ${MAX_IMPORT} kişi eklenebilir.`),
  /** Kullanıcı, dosyadaki herkesten ticari ileti izni alındığını onayladı. */
  consentAll: z.boolean(),
});

/** 905321112233 → "0532 111 22 33" (panelde elle girilenle aynı görünüm). */
function displayPhone(p: string): string {
  const d = p.slice(2);
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/**
 * Excel/CSV'den toplu müşteri ekler. Telefonu zaten kayıtlı olan kişi
 * eklenmez (tekrar kayıt olmaz). İzin işaretli kişiler için ticari ileti
 * izni consents tablosuna yazılır.
 */
export async function importCustomers(
  input: z.input<typeof inputSchema>
): Promise<{ error?: string; created?: number; skipped?: number; consented?: number }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dosyadaki bilgiler okunamadı." };
  const { rows, consentAll } = parsed.data;

  const supabase = await createClient();
  const auth = await authorize(supabase, "musteri_yonet");
  if ("error" in auth) return { error: auth.error };
  const { businessId } = auth;

  const { data: existing, error: readError } = await supabase
    .from("customers")
    .select("phone")
    .eq("business_id", businessId)
    .not("phone", "is", null)
    .limit(50000);
  if (readError) {
    console.error("importCustomers read:", readError);
    return { error: "Mevcut müşteriler okunamadı. Tekrar deneyin." };
  }
  const known = new Set(
    ((existing ?? []) as { phone: string | null }[]).map((c) => (c.phone ? normalizePhone(c.phone) : null)).filter(Boolean)
  );

  const fresh = rows.filter((r) => !r.phone || !known.has(r.phone));
  const skipped = rows.length - fresh.length;
  if (fresh.length === 0) return { created: 0, skipped, consented: 0 };

  let created = 0;
  let consented = 0;
  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500);
    const { data: inserted, error } = await supabase
      .from("customers")
      .insert(
        chunk.map((r) => ({
          business_id: businessId,
          is_lead: false,
          status: "active",
          full_name: r.full_name,
          phone: r.phone ? displayPhone(r.phone) : null,
          email: r.email,
          birthday: r.birthday,
          note: r.note,
          source: "Excel",
        }))
      )
      .select("id");
    if (error) {
      console.error("importCustomers insert:", error);
      if (created === 0) return { error: "Müşteriler eklenemedi. Dosyayı kontrol edip tekrar deneyin." };
      break;
    }
    const ids = ((inserted ?? []) as { id: string }[]).map((x) => x.id);
    created += ids.length;

    const consentRows = chunk
      .map((r, k) => ({ r, id: ids[k] }))
      .filter(({ r, id }) => id && (consentAll || r.consent))
      .map(({ id }) => ({ business_id: businessId, customer_id: id, kind: "sms", granted: true, source: "panel" }));
    if (consentRows.length > 0) {
      const { error: cErr } = await supabase.from("consents").insert(consentRows);
      if (cErr) console.error("importCustomers consent:", cErr);
      else consented += consentRows.length;
    }
  }

  await logBusinessAction(supabase, {
    businessId,
    action: "ekle",
    entity: "musteri",
    summary: `Excel'den ${created} müşteri eklendi`,
    detail: { created, skipped, consented },
  });
  revalidatePath("/musteriler");
  revalidatePath("/kampanyalar");
  return { created, skipped, consented };
}
