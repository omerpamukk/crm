import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Sunucu (server component / route handler) tarafı Supabase istemcisi.
 * Oturum çerezleri next/headers üzerinden okunur/yazılır.
 */
export const ACTING_COOKIE = "acting_business_id";
export const ACTING_MODE_COOKIE = "acting_mode"; // "view" | "manage"

export async function createClient() {
  const cookieStore = await cookies();

  // Süper-admin bir firmayı geziyorsa, acting çereziyle x-acting-business başlığı
  // eklenir → RLS okumayı o firmaya daraltır (0009). "manage" modunda ayrıca
  // x-acting-write: '1' eklenir → RLS yazma politikaları açılır (0010). Başlıklar
  // yalnızca süper-adminlerde etkilidir (RLS is_super_admin kontrol eder).
  const acting = cookieStore.get(ACTING_COOKIE)?.value;
  const mode = cookieStore.get(ACTING_MODE_COOKIE)?.value;
  const headers: Record<string, string> = {};
  if (acting) {
    headers["x-acting-business"] = acting;
    if (mode === "manage") headers["x-acting-write"] = "1";
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(acting ? { global: { headers } } : {}),
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
