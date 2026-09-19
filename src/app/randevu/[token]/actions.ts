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
}

export async function submitBooking(
  input: CreateBookingInput
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim() || !input.phone.trim())
    return { ok: false, error: "Ad ve telefon zorunludur." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p_token: input.token,
    p_name: input.name.trim(),
    p_phone: input.phone.trim(),
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_kvkk: input.kvkk ?? false,
  });

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

/** Seçilen gündeki dolu saatler — müşteriye gösterilmez. */
export async function getBookedSlots(
  token: string,
  day: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("booked_slots", {
    p_token: token,
    p_day: day,
  });

  if (error) {
    console.error("getBookedSlots:", error);
    return [];
  }

  return ((data ?? []) as { slot: string }[]).map((r) => r.slot);
}
