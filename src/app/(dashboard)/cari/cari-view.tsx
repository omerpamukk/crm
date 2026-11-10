"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Phone, Plus, Scale, Search, UserRound } from "lucide-react";

import { formatDate } from "@/lib/format";
import { useMediaQuery, PHONE_QUERY } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { formatMoney, Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status";
import { SwipeRow } from "@/components/shared/swipe-row";

import { useRandevuParams } from "../randevular/use-randevu-params";
import type { CustomerOption, PackageOption } from "../tahsilat/payment-form";
import { PaymentSheet } from "../tahsilat/payment-sheet";
import { CariPane } from "./cari-pane";
import { telHref, type CariRow } from "./cari-types";

const XL_QUERY = "(min-width: 1280px)";

type Scope = "tumu" | "borclu" | "gecikmis";

function round2(n: number) {
  return String(Math.round(n * 100) / 100);
}

function StatusCell({ r }: { r: CariRow }) {
  if (r.overdue) return <StatusBadge variant="danger">Gecikmiş</StatusBadge>;
  if (r.balance > 0) return <StatusBadge variant="warning">Borçlu</StatusBadge>;
  if (r.balance < 0) return <StatusBadge variant="info">Avans</StatusBadge>;
  return <StatusBadge variant="positive">Borcu yok</StatusBadge>;
}

function BalanceCell({ r }: { r: CariRow }) {
  if (r.balance > 0) return <Money amount={r.balance} tone="debt" overdue={r.overdue} />;
  if (r.balance < 0) return <Money amount={Math.abs(r.balance)} tone="muted" suffix="avans" />;
  return <span className="text-label-3">—</span>;
}

export function CariView({
  rows,
  customers,
  packages,
  canPay,
  loadFailed,
}: {
  rows: CariRow[];
  customers: CustomerOption[];
  packages: PackageOption[];
  canPay: boolean;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const isXl = useMediaQuery(XL_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { params, set } = useRandevuParams();

  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [selId, setSelId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payFor, setPayFor] = useState<CariRow | null>(null);

  const createOpen = canPay && params.get("yeni") === "1";
  const payOpen = createOpen || payFor !== null;

  const scopeParam = params.get("durum");
  const scope: Scope = scopeParam === "borclu" || scopeParam === "gecikmis" ? scopeParam : "tumu";

  const totals = useMemo(() => {
    let receivable = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let debtors = 0;
    let charges = 0;
    let payments = 0;
    for (const r of rows) {
      charges += r.charges;
      payments += r.payments;
      if (r.balance > 0) {
        receivable += r.balance;
        debtors++;
      }
      if (r.overdue) {
        overdueAmount += r.balance;
        overdueCount++;
      }
    }
    return { receivable, overdueAmount, overdueCount, debtors, charges, payments };
  }, [rows]);

  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const searched = useMemo(
    () => rows.filter((r) => !needle || `${r.name} ${r.phone ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle)),
    [rows, needle]
  );
  const counts = useMemo(
    () => ({
      tumu: searched.length,
      borclu: searched.filter((r) => r.balance > 0).length,
      gecikmis: searched.filter((r) => r.overdue).length,
    }),
    [searched]
  );
  const filtered = useMemo(
    () => searched.filter((r) => (scope === "borclu" ? r.balance > 0 : scope === "gecikmis" ? r.overdue : true)),
    [searched, scope]
  );

  const effSel = filtered.find((r) => r.id === selId)?.id ?? filtered[0]?.id ?? null;
  const asideRow = rows.find((r) => r.id === effSel) ?? null;
  const sheetRow = rows.find((r) => r.id === selId) ?? null;

  function openRow(r: CariRow) {
    setSelId(r.id);
    if (!window.matchMedia(XL_QUERY).matches) setSheetOpen(true);
  }
  function clearFilters() {
    setQ("");
    set({ q: null, durum: null });
  }
  function openPay(r?: CariRow) {
    if (r) setPayFor(r);
    else set({ yeni: "1" });
  }
  function closePay() {
    setPayFor(null);
    if (params.get("yeni")) set({ yeni: null });
  }

  const columns: DataTableColumn<CariRow>[] = [
    {
      key: "customer",
      header: "Müşteri",
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <span className="min-w-0">
            <Link href={`/musteriler/${r.id}`} className="block truncate font-medium hover:text-primary-text hover:underline" title={r.name}>
              {r.name}
            </Link>
            {r.phone && <span className="block truncate text-subhead text-label-2">{r.phone}</span>}
          </span>
        </span>
      ),
    },
    {
      key: "charges",
      header: "Toplam satış",
      align: "right",
      hideBelow: "@3xl",
      sortValue: (r) => r.charges,
      cell: (r) => <Money amount={r.charges} />,
    },
    {
      key: "payments",
      header: "Tahsil edilen",
      align: "right",
      hideBelow: "@3xl",
      sortValue: (r) => r.payments,
      cell: (r) => <Money amount={r.payments} />,
    },
    {
      key: "balance",
      header: "Bakiye",
      align: "right",
      sortValue: (r) => r.balance,
      cell: (r) => <BalanceCell r={r} />,
    },
    {
      key: "last",
      header: "Son ödeme",
      hideBelow: "@2xl",
      sortValue: (r) => (r.lastPaymentAt ? new Date(r.lastPaymentAt).getTime() : null),
      cell: (r) => <span className="whitespace-nowrap tabular-nums text-label-2">{r.lastPaymentAt ? formatDate(r.lastPaymentAt) : "—"}</span>,
    },
    {
      key: "status",
      header: "Durum",
      sortValue: (r) => (r.overdue ? 3 : r.balance > 0 ? 2 : r.balance < 0 ? 1 : 0),
      cell: (r) => <StatusCell r={r} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (r) =>
        canPay && r.balance > 0 ? (
          <Button variant="tinted" size="sm" onClick={() => openPay(r)} aria-label={`${r.name} için ödeme al`}>
            <Banknote />
            Ödeme al
          </Button>
        ) : null,
    },
  ];

  function renderMobileRow(r: CariRow) {
    const trailing = [
      ...(canPay && r.balance > 0
        ? [{ label: "Ödeme al", icon: Banknote, tone: "primary" as const, onAction: () => openPay(r) }]
        : []),
      ...(r.phone
        ? [{ label: "Ara", icon: Phone, tone: "neutral" as const, onAction: () => (window.location.href = telHref(r.phone!)) }]
        : []),
    ];
    return (
      <SwipeRow trailing={trailing}>
        <button
          type="button"
          onClick={() => openRow(r)}
          aria-label={`${r.name}, ${r.balance > 0 ? `${formatMoney(r.balance)} borç` : "borcu yok"}. Hesabı aç`}
          className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-press focus-visible:outline-offset-[-3px]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{r.name}</span>
            <span className="block truncate text-subhead text-label-2">
              {r.lastPaymentAt ? `Son ödeme ${formatDate(r.lastPaymentAt)}` : "Henüz ödeme yok"}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            {r.balance > 0 ? (
              <Money amount={r.balance} tone="debt" overdue={r.overdue} className="text-[0.9375rem]" />
            ) : (
              <StatusCell r={r} />
            )}
            {r.balance > 0 && <span className="text-subhead whitespace-nowrap text-label-2">{r.overdue ? "Gecikmiş" : "Borçlu"}</span>}
          </span>
        </button>
      </SwipeRow>
    );
  }

  // ---- Boş durumlar ----
  const empty =
    searched.length === 0 ? (
      <EmptyState
        variant="inline"
        icon={Search}
        title="Sonuç yok"
        description={q.trim() ? `“${q.trim()}” ile eşleşen müşteri yok. Yazımı kontrol edin.` : "Aradığınız müşteri yok."}
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Aramayı temizle
          </Button>
        }
      />
    ) : (
      <EmptyState
        variant="inline"
        icon={Scale}
        title={scope === "gecikmis" ? "Gecikmiş ödeme yok" : "Borçlu müşteri yok"}
        description={
          scope === "gecikmis"
            ? "30 günü geçen açık borç yok. Tüm müşterilerin hesabı güncel."
            : "Tüm müşterilerin hesabı kapalı."
        }
        action={
          <Button variant="secondary" onClick={() => set({ durum: null })}>
            Tüm müşterileri göster
          </Button>
        }
      />
    );

  const paySheetCustomers = payFor ? [{ id: payFor.id, full_name: payFor.name }] : customers;
  const paySheetPackages = payFor ? packages.filter((p) => p.customer_id === payFor.id) : packages;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cari Hesap"
        description="Kimin ne kadar borcu olduğunu, ne zaman ödeme yaptığını görün ve ödeme alın."
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Müşteri ara"
            aria-label="Müşteri ara"
          />
        }
        primary={
          canPay ? <ToolbarAction prominent icon={Plus} label="Ödeme al" onClick={() => openPay()} disabled={customers.length === 0} /> : undefined
        }
      />

      {loadFailed ? (
        <ErrorState
          title="Cari hesaplar yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Henüz cari hareket yok"
          description="Paket sattıkça, fiyatlı randevu tamamlandıkça ve ödeme aldıkça müşterilerin hesabı burada görünür."
          action={
            <Button asChild>
              <Link href="/paketler?yeni=1">
                <Plus />
                Paket sat
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <MetricStrip aria-label="Cari özeti">
            <Metric
              label="Toplam alacak"
              value={formatMoney(totals.receivable)}
              tone={totals.receivable > 0 ? "danger" : "default"}
              context={totals.debtors > 0 ? `${totals.debtors} borçlu müşteri` : "Borçlu müşteri yok"}
            />
            <Metric
              label="Gecikmiş"
              value={formatMoney(totals.overdueAmount)}
              tone={totals.overdueAmount > 0 ? "danger" : "default"}
              context={totals.overdueCount > 0 ? `${totals.overdueCount} müşteri · 30+ gün` : "Gecikmiş yok"}
            />
            <Metric label="Toplam satış" value={formatMoney(totals.charges)} />
            <Metric label="Tahsil edilen" value={formatMoney(totals.payments)} />
          </MetricStrip>

          <div className={cn("grid items-start gap-5", "xl:grid-cols-[minmax(0,1fr)_23rem]")}>
            <div className="min-w-0 space-y-4">
              <FilterBar
                scope={{
                  "aria-label": "Hesap durumu",
                  value: scope,
                  onValueChange: (v) => set({ durum: v === "tumu" ? null : v }),
                  items: [
                    { value: "tumu", label: "Tümü", count: counts.tumu },
                    { value: "borclu", label: "Borçlu", count: counts.borclu },
                    { value: "gecikmis", label: "Gecikmiş", count: counts.gecikmis },
                  ],
                }}
                onClearAll={q.trim() ? clearFilters : undefined}
                result={`${filtered.length} müşteri`}
              />
              <DataTable
                caption="Cari hesaplar"
                columns={columns}
                rows={filtered}
                getRowId={(r) => r.id}
                defaultSort={{ key: "balance", dir: "desc" }}
                activeId={isPhone ? null : isXl ? effSel : sheetOpen ? selId : null}
                onRowActivate={openRow}
                renderMobileRow={renderMobileRow}
                empty={empty}
                footer={<span>{filtered.length} müşteri</span>}
              />
            </div>

            <aside
              aria-label="Hesap ayrıntısı"
              className="hidden max-h-[calc(100dvh-var(--toolbar-h)-2rem)] overflow-y-auto overscroll-contain xl:sticky xl:top-[calc(var(--toolbar-h)+1rem)] xl:block"
            >
              {asideRow ? (
                <CariPane key={asideRow.id} row={asideRow} canPay={canPay} onPay={() => openPay(asideRow)} />
              ) : (
                <EmptyState icon={UserRound} title="Müşteri seçin" description="Hareketleri görmek için listeden bir müşteri seçin." />
              )}
            </aside>
          </div>
        </>
      )}

      {/* Dar ekranlarda hesap ayrıntısı: telefonda alt sayfa, tablette sağ panel */}
      <Sheet open={sheetOpen && !isXl && !!sheetRow} onOpenChange={setSheetOpen}>
        <SheetContent side="auto" className="sm:max-w-[26rem]">
          <SheetHeader>
            <SheetTitle>Hesap ayrıntısı</SheetTitle>
            <SheetDescription className="sr-only">Seçili müşterinin bakiyesi ve hareketleri</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {sheetRow && (
              <CariPane
                key={sheetRow.id}
                row={sheetRow}
                canPay={canPay}
                onPay={() => {
                  setSheetOpen(false);
                  openPay(sheetRow);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PaymentSheet
        open={payOpen}
        onOpenChange={(o) => !o && closePay()}
        customers={paySheetCustomers}
        packages={paySheetPackages}
        initial={payFor ? { customer_id: payFor.id, amount: payFor.balance > 0 ? round2(payFor.balance) : undefined } : undefined}
        description={payFor?.name}
      />
    </div>
  );
}
