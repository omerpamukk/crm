import { describe, expect, it } from "vitest";

import { authLinkErrorMessage, parseAuthLink } from "./auth-link";

describe("parseAuthLink", () => {
  it("kurtarma bağlantısındaki token'ları çözer", () => {
    expect(
      parseAuthLink("#access_token=a1&refresh_token=r1&expires_in=3600&type=recovery", "")
    ).toEqual({ kind: "recovery", accessToken: "a1", refreshToken: "r1" });
  });

  it("kurtarma dışındaki token'ları reddeder (oturum enjeksiyonu)", () => {
    expect(parseAuthLink("#access_token=a1&refresh_token=r1", "")).toEqual({
      kind: "error",
      code: "desteklenmeyen",
    });
    expect(parseAuthLink("#access_token=a1&refresh_token=r1&type=magiclink", "")).toEqual({
      kind: "error",
      code: "desteklenmeyen",
    });
  });

  it("refresh token yoksa oturum saymaz", () => {
    expect(parseAuthLink("#access_token=a1", "")).toBeNull();
  });

  it("Supabase hata kodunu genel hatanın önüne koyar", () => {
    expect(
      parseAuthLink("#error=access_denied&error_code=otp_expired&error_description=x", "")
    ).toEqual({ kind: "error", code: "otp_expired" });
  });

  it("callback'in ?hata= parametresini okur", () => {
    expect(parseAuthLink("", "?hata=baglanti-suresi-doldu")).toEqual({
      kind: "error",
      code: "baglanti-suresi-doldu",
    });
  });

  it("bağlantı izi yoksa null döner", () => {
    expect(parseAuthLink("", "")).toBeNull();
    expect(parseAuthLink("#", "?x=1")).toBeNull();
  });
});

describe("authLinkErrorMessage", () => {
  it("süresi dolmuş bağlantıyı ayrı anlatır", () => {
    expect(authLinkErrorMessage("otp_expired")).toContain("süresi dolmuş");
    expect(authLinkErrorMessage("baglanti-gecersiz")).toContain("doğrulanamadı");
  });
});
