import Link from "next/link";
import { Building2, CheckCircle2, PauseCircle, Banknote, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext, can } from "@/lib/supabase/admin-context";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/database";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { AdminFirmList, type FirmRow } from "./admin-firm-list";

export const dynamic = "force-dynamic";

function relTime(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const d = Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "bugün";
  if (d === 1) return "dün";
  if (d < 30) return `${d} gün önce`;
  if (d < 365) return `${Math.floor(d / 30)} ay önce`;
  return `${Math.floor(d / 365)} yıl önce`;
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const adminCtx = await getAdminContext();
  const canCreate = can(adminCtx, "firma_olustur");
  const now = new Date();
  const nowMs = now.getTime();

  // Firma başına sayılar DB'de toplanır (0022_search_perf.sql).
  // Önceden tüm firmaların TÜM müşteri/ödeme/randevu satırları çekilip
  // JS'te gruplanıyordu; platform büyüdükçe lineer patlıyordu.
  const [bizRes, subRes, statsRes, payRes, apptRes] = await Promise.all([
    supabase.from("businesses").select("id, name, sector, created_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("business_id, status, plan, price, expires_at"),
    supabase.rpc("platform_stats"),
    supabase.from("payments").select("business_id, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("appointments").select("business_id, starts_at").order("starts_at", { ascending: false }).limit(500),
  ]);

  type StatRow = { id: string; users: number; customers: number; appointments: number; revenue: number; month_revenue: number };
  const statsById = new Map(
    ((statsRes.data ?? []) as StatRow[]).map((s) => [s.id, s])
  );

  const businesses = (bizRes.data ?? []) as { id: string; name: string; sector: string | null; created_at: string }[];
  const subList = (subRes.data ?? []) as { business_id: string; status: SubscriptionStatus; plan: string; price: number; expires_at: string | null }[];
  const subs = new Map(subList.map((s) => [s.business_id, s]));
  const isExpired = (s?: { status: SubscriptionStatus; expires_at: string | null }) =>
    !!s && (s.status === "active" || s.status === "trial") && !!s.expires_at && new Date(s.expires_at).getTime() < nowMs;

  // Son hareket: son 500 ödeme/randevudan türetilir (tam tarama değil).
  const lastActivity = new Map<string, string>();
  const bump = (bid: string | null, iso: string) => {
    if (!bid) return;
    const cur = lastActivity.get(bid);
    if (!cur || iso > cur) lastActivity.set(bid, iso);
  };
  for (const p of (payRes.data ?? []) as { business_id: string | null; created_at: string }[]) bump(p.business_id, p.created_at);
  for (const a of (apptRes.data ?? []) as { business_id: string | null; starts_at: string }[]) bump(a.business_id, a.starts_at);

  const liveActive = (b: { id: string }) => { const s = subs.get(b.id); return !!s && (s.status === "active" || s.status === "trial") && !isExpired(s); };
  const activeCount = businesses.filter(liveActive).length;
  const suspendedCount = businesses.filter((b) => { const s = subs.get(b.id); return s?.status === "suspended" || s?.status === "cancelled" || isExpired(s); }).length;
  const mrr = businesses.reduce((sum, b) => sum + (liveActive(b) ? (subs.get(b.id)?.price ?? 0) : 0), 0);

  const rows: FirmRow[] = businesses.map((b) => {
    const s = subs.get(b.id);
    const lastIso = lastActivity.get(b.id) ?? null;
    return {
      id: b.id, name: b.name, sector: b.sector, createdLabel: formatDate(b.created_at),
      createdMs: new Date(b.created_at).getTime(),
      userCount: statsById.get(b.id)?.users ?? 0, custCount: statsById.get(b.id)?.customers ?? 0,
      price: s?.price ?? 0,
      status: s?.status ?? "active", plan: s?.plan ?? "trial",
      expired: isExpired(s),
      lastActivityLabel: relTime(lastIso, nowMs),
      lastActivityMs: lastIso ? new Date(lastIso).getTime() : 0,
    };
  });

  const summary = [
    { label: "Toplam Firma", value: String(businesses.length), icon: Building2, tone: "bg-primary/10 text-primary", bar: "border-l-primary" },
    { label: "Aktif Abonelik", value: String(activeCount), icon: CheckCircle2, tone: "bg-positive/10 text-positive", bar: "border-l-positive" },
    { label: "Askıda / İptal", value: String(suspendedCount), icon: PauseCircle, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning" },
    { label: "Aylık Gelir (MRR)", value: formatPrice(mrr), icon: Banknote, tone: "bg-positive/10 text-positive", bar: "border-l-positive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Firmalar</h1>
          <p className="text-sm text-muted-foreground">Tüm işletmeleri görüntüle, yönet ve yeni firma oluştur.</p>
        </div>
        {canCreate && (
          <Link href="/admin/firma-olustur" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Yeni Firma
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={cn("border-l-4", s.bar)}>
              <CardContent className="flex items-center justify-between p-4">
                <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p></div>
                <span className={cn("flex size-10 items-center justify-center rounded-lg", s.tone)}><Icon className="size-5" /></span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {businesses.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Henüz firma yok. “Yeni Firma” ile ilk işletmeyi oluştur.</CardContent></Card>
      ) : (
        <AdminFirmList rows={rows} />
      )}
    </div>
  );
}
