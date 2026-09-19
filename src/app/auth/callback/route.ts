import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase e-posta bağlantılarının dönüş noktası.
 *
 * Şifre sıfırlama ve magic link e-postaları buraya döner; buradaki kod
 * `?code=` parametresini oturuma çevirir (PKCE akışı) ve kullanıcıyı
 * hedefe yönlendirir.
 *
 * Supabase panelinde Redirect URLs listesine eklenmeli:
 *   https://<alan-adi>/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Şifre sıfırlamada "recovery" gelir → yeni şifre ekranına gönderilir.
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/giris?hata=baglanti-gecersiz`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("auth/callback:", error);
    return NextResponse.redirect(`${origin}/giris?hata=baglanti-suresi-doldu`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/yeni-sifre`);
  }

  // Açık hedef varsa ona, yoksa köke (kök zaten role göre yönlendiriyor).
  return NextResponse.redirect(`${origin}${next && next.startsWith("/") ? next : "/"}`);
}
