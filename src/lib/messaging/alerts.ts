import type { SupabaseClient } from "@supabase/supabase-js";

import type { Channel } from "./types";

/**
 * Gönderim hatası uyarısı: SMS/WhatsApp/e-posta kanalı çalışmıyorsa
 * (bakiye bitti, şifre yanlış, bağlantı yok) işletmeye günde bir kez
 * bildirim düşer. Tek bir müşterinin telefonu bozuksa uyarı çıkmaz;
 * o kanalın değil, o kaydın sorunudur.
 */

const CHANNEL_NAME: Record<Channel, string> = { sms: "SMS", whatsapp: "WhatsApp", email: "E-posta" };

/** Bu hata kanalın sorunu mu (yoksa tek alıcının mı)? */
export function isChannelError(error: string | undefined | null): boolean {
  if (!error) return false;
  return !/telefon numarası|Alıcı veya mesaj eksik/i.test(error);
}

export function channelAlert(channel: Channel, error: string): { title: string; detail: string } {
  const name = CHANNEL_NAME[channel];
  if (/bağlanmamış/i.test(error)) {
    return { title: `${name} bağlı değil`, detail: `Hatırlatmalar gidemiyor. Ayarlar → Bağlantılar'dan ${name} hesabınızı bağlayın.` };
  }
  return {
    title: `${name} mesajları gönderilemiyor`,
    detail: channel === "sms" ? "Netgsm hesabınızda bakiye, şifre ve gönderici adını kontrol edin." : "Bağlantı bilgilerinizi kontrol edin.",
  };
}

/** Kanal hatalarını işletme başına günde bir bildirime çevirir. */
export async function alertChannelFailures(
  admin: SupabaseClient,
  failures: Map<string, { channel: Channel; error: string }>,
  now = new Date()
): Promise<void> {
  const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  for (const [businessId, f] of failures) {
    const { title, detail } = channelAlert(f.channel, f.error);
    const { data: recent } = await admin
      .from("notifications")
      .select("id")
      .eq("business_id", businessId)
      .eq("kind", "system")
      .eq("title", title)
      .gte("created_at", since)
      .limit(1);
    if ((recent ?? []).length > 0) continue;
    const { error } = await admin
      .from("notifications")
      .insert({ business_id: businessId, kind: "system", title, detail, href: "/ayarlar?bolum=baglantilar" });
    if (error) console.error("alertChannelFailures:", error);
  }
}
