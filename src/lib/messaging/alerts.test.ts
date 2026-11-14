import { describe, expect, it } from "vitest";

import { channelAlert, isChannelError } from "./alerts";

describe("gönderim uyarısı", () => {
  it("tek alıcının sorunu kanal hatası sayılmaz", () => {
    expect(isChannelError("Geçersiz telefon numarası.")).toBe(false);
    expect(isChannelError("Alıcı veya mesaj eksik.")).toBe(false);
    expect(isChannelError(undefined)).toBe(false);
    expect(isChannelError("Sağlayıcı hatası (30)")).toBe(true);
    expect(isChannelError("Bu kanal henüz bağlanmamış.")).toBe(true);
  });

  it("bağlı değil / gönderilemiyor ayrımı", () => {
    expect(channelAlert("sms", "Bu kanal henüz bağlanmamış.").title).toBe("SMS bağlı değil");
    expect(channelAlert("sms", "Sağlayıcı hatası (30)").title).toBe("SMS mesajları gönderilemiyor");
  });
});
