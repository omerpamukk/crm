import type { Provider, SendRequest, SendResult, Credentials } from "./types";

/**
 * SMS sağlayıcısı — Netgsm.
 *
 * Kimlik bilgileri integrations.credentials içinde tutulur:
 *   { usercode, password, msgheader }
 *
 * Netgsm "00" ile başlayan yanıt verirse başarılı sayılır; aksi halde
 * dönen kod hata olarak kaydedilir.
 */
export const netgsmProvider: Provider = {
  channel: "sms",

  async send(req: SendRequest, creds: Credentials): Promise<SendResult> {
    const { usercode, password, msgheader } = creds;
    if (!usercode || !password || !msgheader) {
      return { ok: false, error: "SMS sağlayıcı bilgileri eksik." };
    }

    const phone = normalizePhone(req.to);
    if (!phone) return { ok: false, error: "Geçersiz telefon numarası." };

    try {
      const params = new URLSearchParams({
        usercode,
        password,
        gsmno: phone,
        message: req.body,
        msgheader,
        dil: "TR",
      });

      const res = await fetch(`https://api.netgsm.com.tr/sms/send/get/?${params}`, {
        method: "GET",
      });

      const text = (await res.text()).trim();
      // "00 <mesaj_id>" veya "01 <mesaj_id>" → başarılı
      if (text.startsWith("00") || text.startsWith("01")) {
        return { ok: true, providerId: text.split(" ")[1] };
      }

      return { ok: false, error: `Sağlayıcı hatası (${text})` };
    } catch (error) {
      console.error("netgsm send:", error);
      return { ok: false, error: "SMS gönderilemedi." };
    }
  },
};

/** "0532 123 45 67" → "905321234567" */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  if (digits.length === 13 && digits.startsWith("900")) return `90${digits.slice(3)}`;
  return null;
}
