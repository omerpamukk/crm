import Link from "next/link";
import { Building2, Users, UserRound, CheckCircle2, PauseCircle, CalendarPlus, Plus, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/database";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_META: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-positive/12 text-positive" },
  trial: { label: "Deneme", cls: "bg-primary/10 text-primary" },
  suspended: { label: "Askıda", cls: "bg-warning/15 text-amber-700" },
  cancelled: { label: "İptal", cls: "bg-danger/12 text-danger" },
};

function relTime(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const diff = nowMs - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d <= 0) return "bugün";
  if (d === 1) return "dün";
  if (d < 30) return `${d} gün önce`;
  if (d < 365) return `${Math.floor(d / 30)} ay önce`;
  return `${Math.floor(d / 365)} yıl önce`;
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const now = new Date();
  const nowMs = now.getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [bizRes, subRes, profRes, custRes, payRes, apptRes] = await Promise.all([
    supabase.from("businesses").select("id, name, sector, created_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("business_id, status, plan"),
    supabase.from("profiles").select("business_id"),
    supabase.from("customers").select("business_id"),
    supabase.from("payments").select("business_id, created_at"),
    supabase.from("appointments").select("business_id, starts_at"),
  ]);

  const businesses = (bizRes.data ?? []) as { id: string; name: string; sector: string | null; created_at: string }[];
  const subs = new Map((((subRes.data ?? []) as { business_id: string; status: SubscriptionStatus; plan: string }[]).map((s) => [s.business_id, s])));

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

  const activeCount = businesses.filter((b) => { const s = subs.get(b.id)?.status; return s === "active" || s === "trial"; }).length;
  const suspendedCount = businesses.filter((b) => { const s = subs.get(b.id)?.status; return s === "suspended" || s === "cancelled"; }).length;
  const newThisMonth = businesses.filter((b) => b.created_at >= startOfMonth).length;

  const summary = [
    { label: "Toplam Firma", value: businesses.length, icon: Building2, tone: "bg-primary/10 text-primary", bar: "border-l-primary" },
    { label: "Aktif Abonelik", value: activeCount, icon: CheckCircle2, tone: "bg-positive/10 text-positive", bar: "border-l-positive" },
    { label: "Askıda / İptal", value: suspendedCount, icon: PauseCircle, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning" },
    { label: "Bu Ay Eklenen", value: `+${newThisMonth}`, icon: CalendarPlus, tone: "bg-sky-100 text-sky-600", bar: "border-l-sky-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Firmalar</h1>
          <p className="text-sm text-muted-foreground">Tüm işletmeleri görüntüle, yönet ve yeni firma oluştur.</p>
        </div>
        <Link href="/admin/firma-olustur" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Yeni Firma
        </Link>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={cn("border-l-4", s.bar)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
                </div>
                <span className={cn("flex size-10 items-center justify-center rounded-lg", s.tone)}><Icon className="size-5" /></span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Firma listesi */}
      {businesses.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Henüz firma yok. “Yeni Firma” ile ilk işletmeyi oluştur.</CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <div className="hidden grid-cols-[2fr_1fr_0.7fr_0.7fr_1fr_1fr_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Firma</span><span>Sektör</span><span>Kullanıcı</span><span>Müşteri</span><span>Abonelik</span><span>Son Aktivite</span><span />
          </div>
          <ul className="divide-y">
            {businesses.map((b) => {
              const st = subs.get(b.id)?.status ?? "active";
              const meta = STATUS_META[st];
              return (
                <li key={b.id}>
                  <Link href={`/admin/firma/${b.id}`} className="grid grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/40 lg:grid-cols-[2fr_1fr_0.7fr_0.7fr_1fr_1fr_auto] lg:gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{b.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">Oluşturma: {formatDate(b.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{b.sector ?? "—"}</span>
                    <span className="flex items-center gap-1 text-sm tabular-nums"><Users className="size-3.5 text-muted-foreground lg:hidden" />{userCount.get(b.id) ?? 0}</span>
                    <span className="flex items-center gap-1 text-sm tabular-nums"><UserRound className="size-3.5 text-muted-foreground lg:hidden" />{custCount.get(b.id) ?? 0}</span>
                    <span><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.cls)}>{meta.label}</span></span>
                    <span className="text-sm text-muted-foreground">{relTime(lastActivity.get(b.id) ?? null, nowMs)}</span>
                    <ChevronRight className="hidden size-4 text-muted-foreground lg:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
