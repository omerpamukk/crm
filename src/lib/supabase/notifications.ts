import { createClient } from "@/lib/supabase/server";

export type NotifKind = "expired" | "expiring" | "suspended" | "cancelled" | "new_firm" | "admin";

export interface NotifItem {
  id: string;
  kind: NotifKind;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href?: string;
}

export interface AdminNotifications {
  items: NotifItem[];
  count: number; // actionable (high + medium)
}

const DAY = 86_400_000;

/** Süper-admin için önemli durumları mevcut veriden türetir (ekstra tablo yok). */
export async function getAdminNotifications(isOwner: boolean): Promise<AdminNotifications> {
  const supabase = await createClient();
  const now = Date.now();

  const [bizRes, subRes] = await Promise.all([
    supabase.from("businesses").select("id, name, created_at"),
    supabase.from("subscriptions").select("business_id, status, plan, expires_at"),
  ]);

  const names = new Map(((bizRes.data ?? []) as { id: string; name: string; created_at: string }[]).map((b) => [b.id, b]));
  const subs = (subRes.data ?? []) as { business_id: string; status: string; plan: string; expires_at: string | null }[];

  const items: NotifItem[] = [];

  for (const s of subs) {
    const b = names.get(s.business_id);
    if (!b) continue;
    const href = `/admin/firma/${s.business_id}`;
    const expMs = s.expires_at ? new Date(s.expires_at).getTime() : null;
    const live = s.status === "active" || s.status === "trial";

    if (live && expMs && expMs < now) {
      items.push({ id: `exp-${s.business_id}`, kind: "expired", severity: "high", title: "Abonelik süresi doldu", detail: `${b.name} · ${planLabel(s.plan)}`, href });
    } else if (live && expMs && expMs - now <= 7 * DAY) {
      const days = Math.max(0, Math.ceil((expMs - now) / DAY));
      items.push({ id: `expg-${s.business_id}`, kind: "expiring", severity: "medium", title: "Abonelik yakında bitiyor", detail: `${b.name} · ${days === 0 ? "bugün" : `${days} gün kaldı`}`, href });
    } else if (s.status === "suspended") {
      items.push({ id: `sus-${s.business_id}`, kind: "suspended", severity: "high", title: "Firma askıda", detail: b.name, href });
    } else if (s.status === "cancelled") {
      items.push({ id: `can-${s.business_id}`, kind: "cancelled", severity: "medium", title: "Abonelik iptal edildi", detail: b.name, href });
    }
  }

  // Son 7 günde eklenen firmalar
  for (const b of (bizRes.data ?? []) as { id: string; name: string; created_at: string }[]) {
    if (now - new Date(b.created_at).getTime() <= 7 * DAY) {
      items.push({ id: `new-${b.id}`, kind: "new_firm", severity: "low", title: "Yeni firma eklendi", detail: `${b.name} · ${relTime(b.created_at, now)}`, href: `/admin/firma/${b.id}` });
    }
  }

  // Kurucuya: son admin işlemleri (audit, son 14 gün)
  if (isOwner) {
    const { data: log } = await supabase
      .from("platform_audit_log")
      .select("id, created_at, actor_name, action, detail")
      .in("action", ["admin_ekle", "admin_sil", "admin_yetki"])
      .order("created_at", { ascending: false })
      .limit(5);
    for (const r of (log ?? []) as { id: string; created_at: string; actor_name: string | null; action: string; detail: string | null }[]) {
      if (now - new Date(r.created_at).getTime() > 14 * DAY) continue;
      items.push({
        id: `aud-${r.id}`, kind: "admin", severity: "low",
        title: r.action === "admin_ekle" ? "Yeni admin eklendi" : r.action === "admin_sil" ? "Admin silindi" : "Admin yetkileri değişti",
        detail: `${r.actor_name ?? "Bilinmeyen"} · ${relTime(r.created_at, now)}`,
        href: "/admin/gunluk",
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { items, count: items.filter((i) => i.severity !== "low").length };
}

function planLabel(p: string): string {
  return ({ trial: "Deneme", temel: "Temel", pro: "Pro" } as Record<string, string>)[p] ?? p;
}
function relTime(iso: string, nowMs: number): string {
  const d = Math.floor((nowMs - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "bugün";
  if (d === 1) return "dün";
  return `${d} gün önce`;
}
