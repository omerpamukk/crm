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

  const [bizRes, subRes, profRes, custRes, payRes, apptRes] = await Promise.all([
    supabase.from("businesses").select("id, name, sector, created_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("business_id, status, plan, price"),
    supabase.from("profiles").select("business_id"),
    supabase.from("customers").select("business_id"),
    supabase.from("payments").select("business_id, created_at"),
    supabase.from("appointments").select("business_id, starts_at"),
  ]);

  const businesses = (bizRes.data ?? []) as { id: string; name: string; sector: string | null; created_at: string }[];
  const subs = new Map((((subRes.data ?? []) as { business_id: string; status: SubscriptionStatus; plan: string; price: number }[]).map((s) => [s.business_id, s])));

  const count = (rows: { business_id: string | null }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.business_id) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1);
    return m;
  };
  const userCount = count((profRes.data ?? []) as { business_id: string | null }[]);
  const custCount = count((custRes.data ?? []) as { business_id: string | null }[]);

  const lastActivity = new Map<string, string>();
  const bump = (bid: string | null, iso: string) => {
    if (!bid) return;
    const cur = lastActivity.get(bid);
    if (!cur || iso > cur) lastActivity.set(bid, iso);
  };
  for (const p of (payRes.data ?? []) as { business_id: string | null; created_at: string }[]) bump(p.business_id, p.created_at);
  for (const a of (apptRes.data ?? []) as { business_id: string | null; starts_at: string }[]) bump(a.business_id, a.starts_at);

  const isActive = (s?: SubscriptionStatus) => s === "active" || s === "trial";
  const activeCount = businesses.filter((b) => isActive(subs.get(b.id)?.status)).length;
  const suspendedCount = businesses.filter((b) => { const s = subs.get(b.id)?.status; return s === "suspended" || s === "cancelled"; }).length;
  const mrr = businesses.reduce((sum, b) => { const s = subs.get(b.id); return sum + (s && isActive(s.status) ? (s.price ?? 0) : 0); }, 0);

  const rows: FirmRow[] = businesses.map((b) => {
    const s = subs.get(b.id);
    return {
      id: b.id, name: b.name, sector: b.sector, createdLabel: formatDate(b.created_at),
      userCount: userCount.get(b.id) ?? 0, custCount: custCount.get(b.id) ?? 0,
      status: s?.status ?? "active", plan: s?.plan ?? "trial",
      lastActivityLabel: relTime(lastActivity.get(b.id) ?? null, nowMs),
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
