"use server";

import { createClient } from "@/lib/supabase/server";

/** Giriş gerektirmez: token yalnızca kendi randevusunu günceller (0040 appointment_respond). */
export async function respondAppointment(token: string, coming: boolean): Promise<{ error?: string }> {
  if (!/^[a-f0-9]{16,64}$/.test(token)) return { error: "Bağlantı geçersiz." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("appointment_respond", { p_token: token, p_coming: coming });
  if (error) {
    console.error("respondAppointment:", error);
    return { error: "Kaydedilemedi. Biraz sonra tekrar deneyin ya da işletmeyi arayın." };
  }
  if (!(data as { ok?: boolean } | null)?.ok) {
    return { error: "Bu randevu artık değiştirilemiyor. Bir sorun varsa işletmeyi arayın." };
  }
  return {};
}
