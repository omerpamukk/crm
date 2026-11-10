import type { createClient } from "./server";
import { getActingSession } from "./admin-context";
import { getBusinessId } from "./business";
import { can, type Capability } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type Authorized = { businessId: string; userId: string; role: UserRole };

/**
 * Server action kapısı: oturum + firma + rolün yeteneği.
 * Başarılıysa `{ businessId, userId, role }`, değilse sade Türkçe `{ error }` döner.
 * Her yazmada `.eq("business_id", businessId)` yine şarttır (RLS ikinci hat).
 *
 * Süper-admin yalnızca "yönet" modundaki firmada owner sayılır; "görüntüle"
 * modunda yazma reddedilir.
 */
export async function authorize(
  supabase: SupabaseServer,
  cap: Capability
): Promise<{ error: string } | Authorized> {
  const businessId = await getBusinessId(supabase);
  if (!businessId) return { error: "Oturum bulunamadı. Sayfayı yenileyip tekrar giriş yapın." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı. Sayfayı yenileyip tekrar giriş yapın." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as { role: UserRole | null; business_id: string | null } | null;

  let role: UserRole | null = p?.business_id === businessId ? p.role : null;
  if (!role) {
    const acting = await getActingSession(supabase, user.id);
    if (acting?.businessId === businessId && acting.mode === "manage") role = "owner";
  }

  if (!role || !can(role, cap)) return { error: "Bu işlem için yetkiniz yok." };
  return { businessId, userId: user.id, role };
}
