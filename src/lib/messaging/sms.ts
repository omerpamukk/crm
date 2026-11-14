import type { Provider, SendRequest, SendResult, Credentials } from "./types";

/**
 * SMS sağlayıcısı — Netgsm REST v2.
 *
 * Kimlik bilgileri integrations.credentials içinde tutulur:
 *   { usercode, password, msgheader }
 *
 * Kimlik bilgisi Basic Auth başlığında gider, adres satırında değil
 * (eski GET uç noktası şifreyi URL'de taşıyordu; sunucu ve vekil
 * kayıtlarına düşebiliyordu). Yanıt kodu "00" başarılıdır.
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
      const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${usercode}:${password}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msgheader,
          encoding: "TR",
          messages: [{ msg: req.body, no: phone }],
        }),
      });

      return parseNetgsmResponse(await res.text());
    } catch (error) {
      console.error("netgsm send:", error);
      return { ok: false, error: "SMS gönderilemedi." };
    }
  },
};

/**
 * Toplu gönderim: tek istekte birden çok, kişiye özel metin (Netgsm n:n).
 * Numaralar önceden normalize edilmiş olmalı. Sonuç tüm parça için tektir.
 */
export async function sendNetgsmBatch(
  messages: { no: string; msg: string }[],
  creds: Credentials
): Promise<SendResult> {
  const { usercode, password, msgheader } = creds;
  if (!usercode || !password || !msgheader) {
    return { ok: false, error: "SMS sağlayıcı bilgileri eksik." };
  }
  if (messages.length === 0) return { ok: true };
  try {
    const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${usercode}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msgheader, encoding: "TR", messages }),
    });
    return parseNetgsmResponse(await res.text());
  } catch (error) {
    console.error("netgsm batch:", error);
    return { ok: false, error: "SMS gönderilemedi." };
  }
}

/** Netgsm REST v2 yanıtı: { code: "00", jobid: "…" } başarılı; diğer kodlar hata. */
export function parseNetgsmResponse(text: string): SendResult {
  try {
    const data = JSON.parse(text) as { code?: string | number; jobid?: string; description?: string } | null;
    if (!data || typeof data !== "object" || data.code === undefined || data.code === null || data.code === "") {
      return { ok: false, error: `Sağlayıcı hatası (${text.slice(0, 40)})` };
    }
    const code = String(data.code).padStart(2, "0");
    if (code === "00") return { ok: true, providerId: data.jobid };
    return { ok: false, error: `Sağlayıcı hatası (${code})` };
  } catch {
    return { ok: false, error: `Sağlayıcı hatası (${text.slice(0, 40)})` };
  }
}

/** "0532 123 45 67" → "905321234567" */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  if (digits.length === 13 && digits.startsWith("900")) return `90${digits.slice(3)}`;
  return null;
}
