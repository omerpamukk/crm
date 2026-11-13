import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ticari ileti izni (0016 consents + 0032).
 *
 * İzin değişince consents tablosuna kayıt düşer: verilince yeni satır,
 * geri alınınca açık satırın revoked_at'i dolar. customers.marketing_sms_at
 * veritabanı tetikleyicisiyle eşitlenir. Geçmiş silinmez; kim ne zaman izin
 * verdi sonradan ispatlanabilir.
 *
 * SMS ve WhatsApp aynı izinle yönetilir (İYS'de ikisi de "MESAJ").
 */
export async function setMarketingConsent(
  supabase: SupabaseClient,
  businessId: string,
  customerId: string,
  granted: boolean
): Promise<{ error?: string }> {
  const { data: open, error: readErr } = await supabase
    .from("consents")
    .select("id, granted")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .eq("kind", "sms")
    .is("revoked_at", null)
    .maybeSingle();

  if (readErr) {
    console.error("setMarketingConsent read:", readErr);
    return { error: "İzin bilgisi kaydedilemedi." };
  }

  const current = open as { id: string; granted: boolean } | null;
  const isGranted = Boolean(current?.granted);
  if (isGranted === granted) return {};

  if (current) {
    const { error } = await supabase
      .from("consents")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", current.id)
      .eq("business_id", businessId);
    if (error) {
      console.error("setMarketingConsent revoke:", error);
      return { error: "İzin bilgisi kaydedilemedi." };
    }
  }

  if (granted) {
    const { error } = await supabase.from("consents").insert({
      business_id: businessId,
      customer_id: customerId,
      kind: "sms",
      granted: true,
      source: "panel",
    });
    if (error) {
      console.error("setMarketingConsent grant:", error);
      return { error: "İzin bilgisi kaydedilemedi." };
    }
  }

  return {};
}
