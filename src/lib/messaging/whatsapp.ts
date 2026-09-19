import type { Provider, SendRequest, SendResult, Credentials } from "./types";
import { normalizePhone } from "./sms";

/**
 * WhatsApp Cloud API (Meta).
 *
 * credentials: { phone_number_id, access_token }
 *
 * NOT: Meta, 24 saatlik müşteri hizmeti penceresi dışında yalnızca
 * ONAYLI ŞABLON gönderimine izin verir. Serbest metin göndermek için
 * müşterinin son 24 saatte yazmış olması gerekir.
 */
export const whatsappProvider: Provider = {
  channel: "whatsapp",

  async send(req: SendRequest, creds: Credentials): Promise<SendResult> {
    const { phone_number_id, access_token } = creds;
    if (!phone_number_id || !access_token) {
      return { ok: false, error: "WhatsApp bağlantı bilgileri eksik." };
    }

    const phone = normalizePhone(req.to);
    if (!phone) return { ok: false, error: "Geçersiz telefon numarası." };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: req.body },
          }),
        }
      );

      if (!res.ok) {
        const detail = await res.text();
        console.error("whatsapp send:", detail);
        return { ok: false, error: "WhatsApp mesajı gönderilemedi." };
      }

      const data = (await res.json()) as { messages?: { id: string }[] };
      return { ok: true, providerId: data.messages?.[0]?.id };
    } catch (error) {
      console.error("whatsapp send:", error);
      return { ok: false, error: "WhatsApp mesajı gönderilemedi." };
    }
  },
};
