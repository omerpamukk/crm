import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Giriş gerektiren yollar (dashboard grubu + onboarding)
const PROTECTED_PREFIXES = [
  "/panel",
  "/yonetici",
  "/raporlar",
  "/musteriler",
  "/leadler",
  "/hizmetler",
  "/randevular",
  "/takvim",
  "/randevu-linki",
  "/mesajlar",
  "/reklamlar",
  "/icerik",
  "/otomasyonlar",
  "/hatirlaticilar",
  "/eposta-sms",
  "/firsatlar",
  "/paketler",
  "/tahsilat",
  "/cari",
  "/giderler",
  "/personel",
  "/isletme-kur",
];
// Yalnızca giriş yapmamış kullanıcıların görebileceği yollar
const AUTH_ONLY_PATHS = ["/giris", "/kayit"];

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthOnly = AUTH_ONLY_PATHS.includes(pathname);

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Env değişkenleri yoksa istemciyi oluşturamayız; korumalı sayfada
  // güvenli tarafta kalıp /giris'e yönlendir (asla 401/hata döndürme).
  if (!supabaseUrl || !supabaseKey) {
    return isProtected ? redirectTo(request, "/giris") : supabaseResponse;
  }

  // Oturumu doğrula. getUser() ağ/oturum hatasında istisna fırlatabilir;
  // bu durumda kullanıcıyı "giriş yapmamış" kabul edip redirect ediyoruz.
  let user = null;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  // Giriş yapmamış kullanıcı korumalı sayfaya girmeye çalışırsa → /giris
  if (!user && isProtected) {
    return redirectTo(request, "/giris");
  }

  // Giriş yapmış kullanıcı giriş/kayıt sayfalarına girmeye çalışırsa → /panel
  if (user && isAuthOnly) {
    return redirectTo(request, "/panel");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Statik dosyalar ve görseller hariç tüm yollar
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
