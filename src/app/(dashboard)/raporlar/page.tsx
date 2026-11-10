import Link from "next/link";
import { BarChart3, CircleAlert, CircleCheck, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { requireCapability } from "@/lib/supabase/guard";
import { formatPrice } from "@/lib/format";
import type { AgencyAccess } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { formatMoney, Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { TrendChart } from "@/components/shared/trend-chart";

import { AY_KISA, AY_UZUN } from "../takvim/zaman";
import { AgencyPanelSheet } from "./agency-panel-sheet";
import { BarList } from "./bar-list";
import { loadReport } from "./data";
import { PeriodControl } from "./period-control";
import { resolvePeriod } from "./period";
import { ReportSection } from "./report-section";

export const metadata = { title: "Raporlar" };

const KINDS = ["hafta", "ay", "ozel"] as const;
const COUNT = new Intl.NumberFormat("tr-TR");

/**
 * Raporlar: seçilen dönemin ciro, gider, kâr, müşteri ve personel özeti.
 * Okuma sayfasıdır (birincil eylemi yok). Yalnızca işletme sahibi görür.
 * Aylık grafikler her zaman dönemin son ayında biten 12 ayı gösterir.
 */
export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ aralik?: string; tarih?: string; bas?: string; bit?: string }>;
}) {
  // Ciro, komisyon ve kâr verisi: yalnızca işletme sahibi.
  await requireCapability("raporlar");

  const sp = await searchParams;
  const now = new Date();
  const period = resolvePeriod(sp, "ay", KINDS, now);

  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  const qs = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")
  ).toString();
  const retryHref = qs ? `/raporlar?${qs}` : "/raporlar";

  const header = (agencies: AgencyAccess[] | null) => (
    <PageHeader
      title="Raporlar"
      description="Seçtiğiniz dönemin ciro, gider, kâr ve personel performansı."
      context={<PeriodControl kinds={KINDS} defaultKind="ay" todayMs={now.getTime()} />}
      secondary={agencies ? <AgencyPanelSheet existing={agencies} /> : undefined}
    />
  );

  const failure = (
    <ErrorState
      title="Raporlar yüklenemedi"
      description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
      action={
        <Button variant="secondary" asChild>
          <Link href={retryHref} replace>
            Tekrar dene
          </Link>
        </Button>
      }
    />
  );

  if (!businessId) {
    return (
      <div className="space-y-8">
        {header(null)}
        {failure}
      </div>
    );
  }

  const [data, agencyRes] = await Promise.all([
    loadReport(supabase, businessId, period, now),
    supabase.from("agency_access").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);
  const agencies = (agencyRes.data ?? []) as AgencyAccess[];

  if (data.failed) {
    return (
      <div className="space-y-8">
        {header(agencies)}
        {failure}
      </div>
    );
  }

  if (!data.hasAnyData) {
    return (
      <div className="space-y-8">
        {header(agencies)}
        <EmptyState
          icon={BarChart3}
          title="Bu dönemde raporlanacak veri yok"
          description="Başka bir dönem seçebilir ya da randevu ve ödeme ekleyebilirsiniz; raporlar kendiliğinden oluşur."
          action={
            <Button asChild>
              <Link href="/randevular?yeni=1">
                <Plus />
                Yeni randevu
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const trend = data.months.map((p) => ({
    label: AY_KISA[p.m - 1],
    hint: `${AY_UZUN[p.m - 1]} ${p.y}`,
    partial: p.partial,
  }));
  const chartEmpty = data.months.every((p) => p.ciro === 0 && p.gider === 0);
  const servicesEmpty = data.months.every((p) => p.hizmet === 0);
  const sparkline = data.months.map((p) => p.ciro);

  return (
    <div className="space-y-8">
      {header(agencies)}

      <MetricStrip aria-label="Dönem özeti">
        <Metric
          label="Ciro"
          value={formatMoney(data.revenue)}
          delta={data.revenueDelta}
          context="önceki döneme göre"
          sparkline={sparkline.some((v) => v > 0) ? sparkline : undefined}
          sparklineTitle="Son 12 ay ciro"
        />
        <Metric
          label="Net kâr"
          value={formatMoney(data.net)}
          tone={data.net < 0 ? "danger" : "default"}
          context={data.margin != null ? `%${data.margin} marj` : "gelir − gider"}
        />
        <Metric
          label="Açık alacak"
          value={formatMoney(data.debt.openDebt)}
          tone={data.debt.openDebt > 0 ? "danger" : "default"}
          href="/cari"
          flag={data.debt.overdueCount > 0 ? `${data.debt.overdueCount} gecikmiş` : undefined}
          context={data.debt.debtorCount > 0 ? `${data.debt.debtorCount} borçlu müşteri` : "Ödeme bekleyen yok"}
        />
        <Metric label="Satılan hizmet" value={COUNT.format(data.servicesSold)} delta={data.servicesDelta} context="önceki döneme göre" />
      </MetricStrip>

      <MetricStrip aria-label="Müşteri özeti">
        <Metric
          label="Müşteri"
          value={COUNT.format(data.customersTotal)}
          href="/musteriler"
          context={data.newCustomers > 0 ? `bu dönem ${data.newCustomers} yeni kişi` : "bu dönem yeni kişi yok"}
        />
        <Metric label="Ort. müşteri değeri" value={formatMoney(data.avgCustomerValue)} context="ödeme yapan müşteri başına" />
        <Metric label="Ort. hizmet ücreti" value={formatMoney(data.avgServiceFee)} context="tamamlanan hizmet başına" />
      </MetricStrip>

      <ReportSection title="Dikkat edilecekler">
        {data.risks.length === 0 ? (
          <p className="flex items-center gap-3 text-[0.9375rem]">
            <CircleCheck aria-hidden className="size-5 shrink-0 text-positive-text" />
            Bu dönem dikkat gerektiren bir durum yok.
          </p>
        ) : (
          <ul role="list" className="space-y-3">
            {data.risks.map((r) => (
              <li key={r.text} className="flex items-start gap-3 text-[0.9375rem]">
                <CircleAlert aria-hidden className={`mt-0.5 size-5 shrink-0 ${r.tone === "danger" ? "text-danger-text" : "text-warning-text"}`} />
                <span className="min-w-0">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <ReportSection title="Ciro ve gider" detail="Son 12 ay" empty={chartEmpty ? "Son 12 ayda ödeme ya da gider kaydı yok." : undefined}>
          <TrendChart
            kind="line"
            unit="money"
            label="Son 12 ay ciro ve gider"
            seriesName="Ciro"
            data={trend.map((t, i) => ({ ...t, value: data.months[i].ciro }))}
            compare={{ name: "Gider", values: data.months.map((p) => p.gider) }}
            height={240}
          />
        </ReportSection>
        <ReportSection title="Satılan hizmet" detail="Son 12 ay" empty={servicesEmpty ? "Son 12 ayda tamamlanan randevu yok." : undefined}>
          <TrendChart
            kind="bar"
            unit="number"
            label="Son 12 ay satılan hizmet"
            seriesName="Hizmet"
            data={trend.map((t, i) => ({ ...t, value: data.months[i].hizmet }))}
            height={240}
          />
        </ReportSection>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ReportSection
          title="Hizmete göre ciro"
          detail="Tamamlanan randevular"
          empty={data.serviceRevenue.length === 0 ? "Bu dönemde fiyatlı, tamamlanmış randevu yok." : undefined}
        >
          <BarList rows={data.serviceRevenue} format={formatMoney} aria-label="Hizmete göre ciro" />
        </ReportSection>
        <ReportSection
          title="Kaynağa göre ciro"
          detail="Müşterinin geldiği kanal"
          empty={data.sourceRevenue.length === 0 ? "Bu dönemde ödeme yok." : undefined}
        >
          <BarList rows={data.sourceRevenue} format={formatMoney} aria-label="Kaynağa göre ciro" />
        </ReportSection>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ReportSection title="Müşteri yolu" detail="Bu dönem" empty={data.funnel.every((f) => f.value === 0) ? "Bu dönemde yeni kişi ya da randevu yok." : undefined}>
          <BarList rows={data.funnel} format={(n) => COUNT.format(n)} aria-label="Müşteri yolu" />
        </ReportSection>
        <ReportSection
          title="Yeni kişilerin kaynağı"
          detail="Bu dönem"
          empty={data.sourceCustomers.length === 0 ? "Bu dönemde yeni kişi eklenmedi." : undefined}
        >
          <BarList rows={data.sourceCustomers} format={(n) => COUNT.format(n)} aria-label="Yeni kişilerin kaynağı" />
        </ReportSection>
      </div>

      {data.staff.length > 0 ? (
        <ListGroup title="Personel performansı" detail="Tamamlanan randevulardan" inset={64} aria-label="Personel performansı">
          {data.staff.map((s) => (
            <ListRow
              key={s.id}
              leading={<Avatar name={s.name} size="md" />}
              title={s.name}
              subtitle={`${s.count} randevu${s.rate > 0 ? ` · komisyon %${s.rate}` : ""}`}
              meta={s.commission > 0 ? <span className="text-label-2">Hak ediş {formatPrice(s.commission)}</span> : undefined}
              trailing={<Money amount={s.revenue} className="font-semibold" />}
            />
          ))}
        </ListGroup>
      ) : (
        <ReportSection title="Personel performansı" empty="Bu dönemde personele bağlı tamamlanmış randevu yok. Randevuya personel atadıkça burada görünür." />
      )}
    </div>
  );
}
