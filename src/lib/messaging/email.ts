import type { Provider, SendRequest, SendResult, Credentials } from "./types";

/**
 * E-posta sağlayıcısı — Resend (HTTP API).
 *
 * SMTP yerine HTTP tercih edildi: Vercel'in sunucusuz ortamında SMTP
 * bağlantıları güvenilir değil (soket ömrü kısa, port kısıtı var).
 *
 * credentials: { api_key, from }
 */
export const resendProvider: Provider = {
  channel: "email",

  async send(req: SendRequest, creds: Credentials): Promise<SendResult> {
    const { api_key, from } = creds;
    if (!api_key || !from) {
      return { ok: false, error: "E-posta sağlayıcı bilgileri eksik." };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.to)) {
      return { ok: false, error: "Geçersiz e-posta adresi." };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [req.to],
          subject: req.subject ?? "Bilgilendirme",
          text: req.body,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error("resend send:", detail);
        return { ok: false, error: "E-posta gönderilemedi." };
      }

      const data = (await res.json()) as { id?: string };
      return { ok: true, providerId: data.id };
    } catch (error) {
      console.error("resend send:", error);
      return { ok: false, error: "E-posta gönderilemedi." };
    }
  },
};
