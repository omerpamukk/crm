import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminContext, can } from "@/lib/supabase/admin-context";
import type { Business, Subscription } from "@/types/database";

import { FirmaDetail, type FirmaUser } from "./firma-detail";

export const dynamic = "force-dynamic";

export default async function FirmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
  if (!business) notFound();

  const [subRes, profRes, custRes, apptRes, payRes] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("business_id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name, role").eq("business_id", id),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("payments").select("amount").eq("business_id", id),
  ]);

  const profiles = (profRes.data ?? []) as { id: string; full_name: string | null; role: string }[];

  // E-posta/telefon/durum auth.users'tan (service_role) — anahtar yoksa zarifçe boş
  const metaById = new Map<string, { email: string; phone: string | null; banned: boolean }>();
  try {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const nowIso = new Date().toISOString();
    for (const u of list?.users ?? []) {
      const bannedUntil = (u as { banned_until?: string | null }).banned_until ?? null;
      metaById.set(u.id, {
        email: u.email ?? "—",
        phone: (u.user_metadata?.phone as string | undefined) ?? null,
        banned: !!bannedUntil && bannedUntil > nowIso,
      });
    }
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY ayarlı değilse meta gösterilmez (sayfa yine çalışır)
  }

  const users: FirmaUser[] = profiles.map((p) => {
    const m = metaById.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role === "staff" ? "staff" : "owner",
      email: m?.email ?? "—",
      phone: m?.phone ?? null,
      banned: m?.banned ?? false,
    };
  });

  const revenue = ((payRes.data ?? []) as { amount: number | null }[]).reduce((s, p) => s + (p.amount ?? 0), 0);

  const ctx = await getAdminContext();
  const perms = {
    goruntule: can(ctx, "goruntule"),
    yonet: can(ctx, "yonet"),
    firma_duzenle: can(ctx, "firma_duzenle"),
    abonelik: can(ctx, "abonelik"),
    kullanici_yonet: can(ctx, "kullanici_yonet"),
  };

  return (
    <FirmaDetail
      business={business as Business}
      subscription={(subRes.data ?? null) as Subscription | null}
      users={users}
      stats={{ customers: custRes.count ?? 0, appointments: apptRes.count ?? 0, revenue }}
      perms={perms}
    />
  );
}
