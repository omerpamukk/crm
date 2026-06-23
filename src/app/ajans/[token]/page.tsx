import {
  Flower2,
  Banknote,
  PieChart,
  Receipt,
  Users,
  ListChecks,
  Sparkles,
  TrendingUp,
  Lock,
  BarChart3,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate } from "@/lib/format";
import { RevenueAreaChart, TrendChart } from "../../(dashboard)/raporlar/charts";

const MONTH_NAMES = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
const PALETTE = ["#5B5BD6", "#16A34A", "#F59E0B", "#0EA5E9", "#E11D48", "#8B5CF6", "#64748B"];

type Panel = {
  valid: boolean;
  business_name?: string;
  permission?: string;
  sections?: string[];
  expires_at?: string | null;
  data?: {
    revenue: number;
    expense: number;
    services_sold: number;
    customers_total: number;
    leads_total: number;
    service_profitability: { name: string; value: number }[];
    source_revenue: { name: string; value: number }[];
    monthly: { month: string; ciro: number; hizmet: number; yeni: number }[];
    recent_payments: { amount: number; created_at: string }[];
  };
};

function Bars({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Veri yok.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.name} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{r.name}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
          <span className="w-20 shrink-0 text-right font-medium tabular-nums">{formatPrice(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Başlık + sağına doğru solan modern çizgi (yapışık değil). */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-[18px]" />
        </span>
        <h2 className="shrink-0 text-sm font-semibold uppercase tracking-wide">
          {title}
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-border via-border/60 to-transparent" />
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function AjansPanelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("agency_panel", { p_token: token });
  const panel = (raw ?? { valid: false }) as Panel;

  if (!panel.valid || !panel.data) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <Lock className="size-7" />
        </span>
        <h1 className="text-xl font-bold">Bağlantı geçersiz veya süresi dolmuş</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Bu ajans paneli bağlantısı artık aktif değil. Lütfen işletme ile iletişime geçin.
        </p>
      </div>
    );
  }

  const d = panel.data;
  const sections = panel.sections ?? [];
  const has = (k: string) => sections.includes(k);
  const net = d.revenue - d.expense;
  const margin = d.revenue > 0 ? Math.round((net / d.revenue) * 100) : 0;
  const conversion =
    d.customers_total + d.leads_total > 0
      ? Math.round((d.customers_total / (d.customers_total + d.leads_total)) * 100)
      : 0;

  // Trend verisi (müşteri kümülatif)
  const newInWindow = d.monthly.reduce((s, m) => s + m.yeni, 0);
  const base = d.customers_total - newInWindow;
  const trendData = d.monthly.map((m, i) => {
    const cum = base + d.monthly.slice(0, i + 1).reduce((s, x) => s + x.yeni, 0);
    const mi = Number(m.month.split("-")[1]) - 1;
    return { label: MONTH_NAMES[mi] ?? m.month, ciro: m.ciro, musteri: cum, hizmet: m.hizmet };
  });
  const revenueData = d.monthly.map((m) => {
    const mi = Number(m.month.split("-")[1]) - 1;
    return { label: MONTH_NAMES[mi] ?? m.month, value: m.ciro };
  });

  // KPI kartları — her bölüm bire-bir kontrol eder
  const kpis: { label: string; value: string; sub?: string; icon: LucideIcon; tone: string }[] = [];
  if (has("ciro_netkar")) {
    kpis.push({ label: "Toplam Ciro", value: formatPrice(d.revenue), icon: Banknote, tone: "bg-positive/10 text-positive" });
    kpis.push({ label: "Net Kâr", value: formatPrice(net), sub: `%${margin} marj`, icon: PieChart, tone: net >= 0 ? "bg-positive/10 text-positive" : "bg-danger/10 text-danger" });
  }
  if (has("musteri_hizmet")) {
    kpis.push({ label: "Toplam Müşteri", value: d.customers_total.toLocaleString("tr-TR"), icon: Users, tone: "bg-primary/10 text-primary" });
    kpis.push({ label: "Satılan Hizmet", value: d.services_sold.toLocaleString("tr-TR"), icon: ListChecks, tone: "bg-warning/12 text-amber-600" });
  }

  const nothingSelected = sections.length === 0;

  return (
    <div className="min-h-svh bg-muted/30">
      {/* Üst bar */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white">
              <Flower2 className="size-5" />
            </span>
            <div>
              <p className="font-semibold leading-tight">{panel.business_name}</p>
              <p className="text-xs text-muted-foreground">Ajans Paneli · Salt-okunur</p>
            </div>
          </div>
          {panel.expires_at && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              Erişim bitişi: {formatDate(panel.expires_at)}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
        {nothingSelected && (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            Bu panelde gösterilecek bölüm seçilmemiş.
          </div>
        )}

        {/* KPI kartları */}
        {kpis.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <Kpi key={k.label} {...k} />
            ))}
          </div>
        )}

        {/* Kazanç istatistikleri (dönemsel gelir) */}
        {has("kazanc") && (
          <Section title="Kazanç İstatistikleri" icon={BarChart3}>
            <RevenueAreaChart data={revenueData} />
          </Section>
        )}

        {/* Aylık trend */}
        {has("aylik_grafik") && (
          <Section title="Aylık Ciro / Müşteri / Hizmet" icon={TrendingUp}>
            <TrendChart data={trendData} />
          </Section>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {has("hizmet_karlilik") && (
            <Section title="Hizmet Bazlı Kârlılık" icon={PieChart}>
              <Bars rows={d.service_profitability} />
            </Section>
          )}
          {has("kaynak_gelir") && (
            <Section title="Kaynak Bazlı Gelir" icon={BarChart3}>
              <Bars rows={d.source_revenue} />
            </Section>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {has("aylik_gider") && (
            <Section title="Giderler (Son 12 Ay)" icon={Receipt}>
              <p className="text-2xl font-bold text-danger">{formatPrice(d.expense)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Net kâr: <span className="font-medium text-positive">{formatPrice(net)}</span>
              </p>
            </Section>
          )}
          {has("potansiyel") && (
            <Section title="Potansiyel Müşteri & Dönüşüm" icon={Sparkles}>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-2xl font-bold">{d.leads_total}</p>
                  <p className="text-xs text-muted-foreground">Aktif lead</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-2xl font-bold">%{conversion}</p>
                  <p className="text-xs text-muted-foreground">Lead dönüşümü</p>
                </div>
              </div>
            </Section>
          )}
        </div>

        {has("gelir_girisi") && (
          <Section title="Son Gelir Kayıtları" icon={Banknote}>
            {d.recent_payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              <ul className="divide-y">
                {d.recent_payments.map((p, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">{formatDate(p.created_at)}</span>
                    <span className="font-medium tabular-nums text-positive">{formatPrice(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {has("reklam_kampanya") && (
          <Section title="Reklam & Kampanya Verileri" icon={Megaphone}>
            <p className="py-4 text-center text-sm text-muted-foreground">
              Meta reklam entegrasyonu yakında eklenecek.
            </p>
          </Section>
        )}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Bu panel salt-okunur olarak paylaşılmıştır · {panel.business_name}
        </p>
      </main>
    </div>
  );
}
