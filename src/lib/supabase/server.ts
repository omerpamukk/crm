import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Sunucu (server component / route handler) tarafı Supabase istemcisi.
 * Oturum çerezleri next/headers üzerinden okunur/yazılır.
 */
export const ACTING_COOKIE = "acting_business_id";

export async function createClient() {
  const cookieStore = await cookies();

  // Süper-admin bir firmayı "görüntüleyici olarak" geziyorsa, acting çereziyle
  // x-acting-business başlığını ekle. RLS bu başlığı görüp okumayı o firmaya
  // daraltır (0009). Başlık yalnızca süper-adminlerde etkilidir (RLS is_super_admin
  // kontrol eder); normal kullanıcıda hiçbir etkisi olmaz.
  const acting = cookieStore.get(ACTING_COOKIE)?.value;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(acting ? { global: { headers: { "x-acting-business": acting } } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component içinden çağrıldığında set() hata verebilir;
            // oturum yenileme middleware tarafında yapıldığı için yok sayılır.
          }
        },
      },
    }
  );
}
