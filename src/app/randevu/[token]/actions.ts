"use server";

import { createClient } from "@/lib/supabase/server";

export interface CreateBookingInput {
  token: string;
  name: string;
  phone: string;
  serviceId: string;
  startsAt: string; // ISO
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
  });

  if (error) return { ok: false, error: "Randevu oluşturulamadı. Lütfen tekrar deneyin." };

  const res = (data ?? { ok: false }) as { ok: boolean; error?: string };
  if (!res.ok) {
    const map: Record<string, string> = {
      gecersiz_link: "Randevu linki geçersiz.",
      eksik_bilgi: "Lütfen ad ve telefon bilgisini doldurun.",
    };
    return { ok: false, error: map[res.error ?? ""] ?? "Randevu oluşturulamadı." };
  }
  return { ok: true };
}
