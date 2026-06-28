import { createClient } from "@supabase/supabase-js";

/**
 * ⚠️ SERVER ONLY — service_role anahtarı TÜM RLS'i baypas eder ve tam yetkilidir.
 * Bu dosya YALNIZCA server action ("use server") / route handler içinden import edilmeli,
 * ASLA bir client bileşeninden değil.
 *
 * Güvenlik: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ öneki almadığı için Next.js onu
 * client bundle'a HİÇ koymaz; yanlışlıkla client'ta okunsa bile undefined gelir (sızmaz).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ve URL) tanımlı değil. Sağlama (provisioning) için gereklidir."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
