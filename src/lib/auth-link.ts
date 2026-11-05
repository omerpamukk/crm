/**
 * E-posta bağlantısıyla (şifre sıfırlama, Supabase panelinden gönderilen
 * kurtarma linki) dönen adresi çözer.
 *
 * Supabase iki biçimde döner:
 *   - başarılı: `#access_token=…&refresh_token=…&type=recovery`
 *   - hatalı:   `#error=access_denied&error_code=otp_expired&…`
 * Ayrıca /auth/callback kendi hatalarını `?hata=` ile iletir.
 */
export type AuthLinkResult =
  | { kind: "recovery"; accessToken: string; refreshToken: string }
  | { kind: "error"; code: string };

export function parseAuthLink(hash: string, search: string): AuthLinkResult | null {
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const q = new URLSearchParams(search);

  const accessToken = h.get("access_token");
  const refreshToken = h.get("refresh_token");
  if (accessToken && refreshToken) {
    // Yalnızca kurtarma bağlantısı kabul edilir. Aksi halde herhangi bir
    // kullanıcı kendi oturum token'larıyla link üretip başkasını kendi
    // hesabına sokabilirdi.
    if (h.get("type") !== "recovery") return { kind: "error", code: "desteklenmeyen" };
    return { kind: "recovery", accessToken, refreshToken };
  }

  const code =
    h.get("error_code") ?? h.get("error") ?? q.get("error_code") ?? q.get("error") ?? q.get("hata");
  if (code) return { kind: "error", code };

  return null;
}

export function authLinkErrorMessage(code: string): string {
  if (code === "otp_expired" || code === "baglanti-suresi-doldu") {
    return "Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bir sıfırlama bağlantısı iste.";
  }
  return "Bağlantı doğrulanamadı. Yeni bir sıfırlama bağlantısı iste.";
}
