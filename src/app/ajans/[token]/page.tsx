import { Lock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { formatMoney } from "@/components/shared/money";
import { TrendChart } from "@/components/shared/trend-chart";

import { AY_KISA, AY_UZUN } from "../../(dashboard)/takvim/zaman";
import { BarList } from "../../(dashboard)/raporlar/bar-list";
import { ReportSection } from "../../(dashboard)/raporlar/report-section";

export const metadata = { title: "Ajans paneli" };

const COUNT = new Intl.NumberFormat("tr-TR");

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

/** Ajansın salt okunur raporu: işletmenin seçtiği bölümler, bağlantıyla açılır. */
export default async function AjansPanelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("agency_panel", { p_token: token });
  const panel = (raw ?? { valid: false }) as Panel;

  if (!panel.valid || !panel.data) {
    return (
      <>
        <div className="app-wall" aria-hidden />
        <main className="mx-auto flex min-h-svh w-full max-w-xl items-center px-4 py-10">
          <EmptyState
            className="w-full"
            icon={Lock}
            title="Bağlantı geçersiz ya da süresi dolmuş"
            description="Bu rapor bağlantısı artık açık değil. Yeni bir bağlantı için işletmeyle iletişime geçin."
          />
        </main>
      </>
    );
  }

  const d = panel.data;
  const sections = panel.sections ?? [];
  const has = (k: string) => sections.includes(k);
  // reklam_kampanya: henüz çalışmayan bölüm, eski erişimlerde seçili kalmış olabilir; gösterilmez.
  const shown = sections.filter((k) => k !== "reklam_kampanya");
  const net = d.revenue - d.expense;
  const margin = d.revenue > 0 ? Math.round((net / d.revenue) * 100) : null;
  const conversion =
    d.customers_total + d.leads_total > 0 ? Math.round((d.customers_total / (d.customers_total + d.leads_total)) * 100) : 0;

  const points = d.monthly.map((m) => {
    const [y, mo] = m.month.split("-").map(Number);
    return { label: AY_KISA[mo - 1] ?? m.month, hint: `${AY_UZUN[mo - 1] ?? ""} ${y}`.trim(), ciro: m.ciro, hizmet: m.hizmet, yeni: m.yeni };
  });
  const money = (n: number) => formatMoney(n);

  return (
    <>
      <div className="app-wall" aria-hidden />
      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-10">
        <header className="space-y-1">
          <p className="eyebrow">Ajans paneli · Salt okunur</p>
          <h1 className="page-title truncate" title={panel.business_name}>
            {panel.business_name}
          </h1>
          {panel.expires_at && (
            <p className="text-subhead text-label-2">Erişim bitişi: {formatDate(panel.expires_at)}</p>
          )}
        </header>

        {shown.length === 0 && (
          <EmptyState
            icon={Lock}
            title="Gösterilecek bölüm yok"
            description="İşletme bu bağlantıya henüz bir bölüm açmamış. Bölüm açması için işletmeyle iletişime geçin."
          />
        )}

        {(has("ciro_netkar") || has("musteri_hizmet")) && (
          <MetricStrip aria-label="Özet">
            {has("ciro_netkar") && <Metric label="Ciro" value={money(d.revenue)} />}
            {has("ciro_netkar") && (
              <Metric
                label="Net kâr"
                value={money(net)}
                tone={net < 0 ? "danger" : "default"}
                context={margin != null ? `%${margin} marj` : undefined}
              />
            )}
            {has("musteri_hizmet") && <Metric label="Müşteri" value={COUNT.format(d.customers_total)} />}
            {has("musteri_hizmet") && <Metric label="Satılan hizmet" value={COUNT.format(d.services_sold)} />}
          </MetricStrip>
        )}

        {has("kazanc") && (
          <ReportSection
            title="Kazanç"
            detail="Aylık ciro"
            empty={points.every((p) => p.ciro === 0) ? "Bu dönemde kazanç kaydı yok." : undefined}
          >
            <TrendChart
              kind="line"
              unit="money"
              label="Aylık ciro"
              seriesName="Ciro"
              data={points.map((p) => ({ label: p.label, hint: p.hint, value: p.ciro }))}
              height={240}
            />
          </ReportSection>
        )}

        {has("aylik_grafik") && (
          <div className="grid gap-8 lg:grid-cols-2">
            <ReportSection
              title="Satılan hizmet"
              detail="Aylık"
              empty={points.every((p) => p.hizmet === 0) ? "Bu dönemde satılan hizmet yok." : undefined}
            >
              <TrendChart
                kind="bar"
                unit="number"
                label="Aylık satılan hizmet"
                seriesName="Hizmet"
                data={points.map((p) => ({ label: p.label, hint: p.hint, value: p.hizmet }))}
                height={220}
              />
            </ReportSection>
            <ReportSection
              title="Yeni müşteri"
              detail="Aylık"
              empty={points.every((p) => p.yeni === 0) ? "Bu dönemde yeni müşteri yok." : undefined}
            >
              <TrendChart
                kind="bar"
                unit="number"
                label="Aylık yeni müşteri"
                seriesName="Yeni müşteri"
                data={points.map((p) => ({ label: p.label, hint: p.hint, value: p.yeni }))}
                height={220}
              />
            </ReportSection>
          </div>
        )}

        {(has("hizmet_karlilik") || has("kaynak_gelir")) && (
          <div className="grid gap-8 lg:grid-cols-2">
            {has("hizmet_karlilik") && (
              <ReportSection
                title="Hizmete göre ciro"
                empty={d.service_profitability.length === 0 ? "Henüz veri yok." : undefined}
              >
                <BarList rows={d.service_profitability} format={money} aria-label="Hizmete göre ciro" />
              </ReportSection>
            )}
            {has("kaynak_gelir") && (
              <ReportSection title="Kaynağa göre ciro" empty={d.source_revenue.length === 0 ? "Henüz veri yok." : undefined}>
                <BarList rows={d.source_revenue} format={money} aria-label="Kaynağa göre ciro" />
              </ReportSection>
            )}
          </div>
        )}

        {(has("aylik_gider") || has("potansiyel")) && (
          <MetricStrip aria-label="Gider ve potansiyel müşteri">
            {has("aylik_gider") && <Metric label="Gider" value={money(d.expense)} context="Son 12 ay" />}
            {has("aylik_gider") && (
              <Metric label="Net kâr" value={money(net)} tone={net < 0 ? "danger" : "default"} context="Gelir − gider" />
            )}
            {has("potansiyel") && <Metric label="Potansiyel müşteri" value={COUNT.format(d.leads_total)} context="Açık kayıt" />}
            {has("potansiyel") && <Metric label="Dönüşüm" value={`%${conversion}`} context="Müşteriye dönen" />}
          </MetricStrip>
        )}

        {has("gelir_girisi") &&
          (d.recent_payments.length === 0 ? (
            <ReportSection title="Son gelirler" empty="Henüz gelir kaydı yok." />
          ) : (
            <ListGroup title="Son gelirler" aria-label="Son gelirler">
              {d.recent_payments.map((p, i) => (
                <ListRow
                  key={`${p.created_at}-${i}`}
                  title={formatDate(p.created_at)}
                  trailing={<span className="font-semibold tabular-nums">{formatPrice(p.amount)}</span>}
                />
              ))}
            </ListGroup>
          ))}

        <p className="pt-2 text-center text-subhead text-label-2">
          Bu rapor salt okunur olarak paylaşılmıştır · {panel.business_name}
        </p>
      </main>
    </>
  );
}
