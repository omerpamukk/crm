import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Giriş gerektiren yollar (dashboard grubu + onboarding)
const PROTECTED_PREFIXES = [
  "/panel",
  "/musteriler",
  "/hizmetler",
  "/randevular",
  "/paketler",
  "/isletme-kur",
];
// Yalnızca giriş yapmamış kullanıcıların görebileceği yollar
const AUTH_ONLY_PATHS = ["/giris", "/kayit"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // Önemli: getUser() ile oturumu doğrula (token yenilemesi burada olur).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthOnly = AUTH_ONLY_PATHS.includes(pathname);

  // Giriş yapmamış kullanıcı korumalı sayfaya girmeye çalışırsa → /giris
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  // Giriş yapmış kullanıcı giriş/kayıt sayfalarına girmeye çalışırsa → /panel
  if (user && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Statik dosyalar ve görseller hariç tüm yollar
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
