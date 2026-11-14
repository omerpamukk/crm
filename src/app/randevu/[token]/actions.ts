"use server";

import { createClient } from "@/lib/supabase/server";

export interface CreateBookingInput {
  token: string;
  name: string;
  phone: string;
  serviceId: string;
  startsAt: string; // ISO
  /** KVKK aydınlatma metni onayı (0016 + 0024). */
  kvkk?: boolean;
  /** Seçilen personel (0042). Yok = işletme atar / "Fark etmez". */
  staffId?: string | null;
}

export async function submitBooking(
  input: CreateBookingInput
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim() || !input.phone.trim())
    return { ok: false, error: "Ad ve telefon zorunludur." };

  const supabase = await createClient();
  const args = {
    p_token: input.token,
    p_name: input.name.trim(),
    p_phone: input.phone.trim(),
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_kvkk: input.kvkk ?? false,
  };
  let { data, error } = input.staffId
    ? await supabase.rpc("create_booking", { ...args, p_staff_id: input.staffId })
    : await supabase.rpc("create_booking", args);
  // 0042 çalışmadıysa personelli sürüm yok: personelsiz kaydet.
  if (error?.code === "PGRST202" && input.staffId) {
    ({ data, error } = await supabase.rpc("create_booking", args));
  }

  if (error) {
    console.error("submitBooking:", error);
    return { ok: false, error: "Randevu oluşturulamadı. Lütfen tekrar deneyin." };
  }

  const res = (data ?? { ok: false }) as { ok: boolean; error?: string };
  if (!res.ok) {
    const map: Record<string, string> = {
      gecersiz_link: "Randevu linki geçersiz.",
      eksik_bilgi: "Lütfen ad ve telefon bilgisini doldurun.",
      gecmis_tarih: "Geçmiş bir tarihe randevu alınamaz.",
      slot_dolu: "Bu saat doldu. Lütfen başka bir saat seçin.",
      zaten_randevu_var: "Bu saatte zaten randevunuz var.",
    };
    return { ok: false, error: map[res.error ?? ""] ?? "Randevu oluşturulamadı." };
  }
  return { ok: true };
}

/**
 * Seçilen gündeki dolu saatler — müşteriye gösterilmez.
 * Personel seçimi açıksa (0042) hizmete ve personele göre hesaplanır;
 * staffId yok = "Fark etmez" (hizmeti veren biri boşsa saat açık).
 */
export async function getBookedSlots(
  token: string,
  day: string,
  serviceId?: string | null,
  staffId?: string | null
): Promise<string[]> {
  const supabase = await createClient();
  let { data, error } = serviceId
    ? await supabase.rpc("booking_blocked_slots", {
        p_token: token,
        p_day: day,
        p_service_id: serviceId,
        p_staff_id: staffId ?? null,
      })
    : await supabase.rpc("booked_slots", { p_token: token, p_day: day });
  if (error && serviceId) {
    // 0042 çalışmadıysa eski hesap
    ({ data, error } = await supabase.rpc("booked_slots", { p_token: token, p_day: day }));
  }

  if (error) {
    console.error("getBookedSlots:", error);
    return [];
  }

  return ((data ?? []) as { slot: string }[]).map((r) => r.slot);
}
