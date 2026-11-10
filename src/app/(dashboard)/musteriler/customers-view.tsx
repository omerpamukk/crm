"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote as BanknoteIcon, ChevronRight, Download, PanelRight, Phone as PhoneIcon, Plus, Search, UserRound, Users } from "lucide-react";

import { customerStatusLabel, customerStatusVariant } from "@/lib/constants";
import { useUrlState } from "@/lib/use-url-state";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { Money, formatMoney } from "@/components/shared/money";
import { PackageProgress } from "@/components/shared/package-progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, StatusDot } from "@/components/shared/status";
import { SwipeRow } from "@/components/shared/swipe-row";

import { CustomerFilters, type FilterDef } from "./customer-filters";
import { CustomerPane } from "./customer-detail-pane";
import { AppointmentSheet, CustomerCreateSheet, PaymentSheet } from "./customer-sheets";
import {
  DAY,
  INTERACTION_LABEL,
  apptWhen,
  groupOf,
  relTime,
  telHref,
  type CustomerAbilities,
  type EnrichedCustomer,
  type PackageOption,
  type Scope,
  type ServiceOption,
  type StaffOption,
} from "./customer-types";

export type CustomerMetrics = {
  active: number;
  monthSessions: number;
  newThisMonth: number;
  openDebt: number;
  debtorCount: number;
  overdueCount: number;
};

const FILTER_KEYS = ["hizmet", "kalan", "odeme", "deger", "iletisim", "etiket"] as const;
const XL_QUERY = "(min-width: 1280px)";
const nf = (n: number) => n.toLocaleString("tr-TR");

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function CustomersView({
  customers,
  metrics,
  services,
  serviceNames,
  staff,
  packages,
  tags,
  abilities,
  canArrive,
  limited,
  limit,
  loadFailed,
}: {
  customers: EnrichedCustomer[];
  metrics: CustomerMetrics;
  services: ServiceOption[];
  serviceNames: string[];
  staff: StaffOption[];
  packages: PackageOption[];
  tags: string[];
  abilities: CustomerAbilities;
  canArrive: boolean;
  limited: boolean;
  limit: number;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [nowMs] = useState(() => Date.now());
  const isXl = useMediaQuery(XL_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);

  // Filtreler URL'de tutulur: geri dönünce sıfırlanmaz, bağlantı paylaşılabilir.
  const [scopeRaw, setScope] = useUrlState("durum", "aktif");
  const scope = (["aktif", "pasif", "arsiv"].includes(scopeRaw) ? scopeRaw : "aktif") as Scope;
  const [qUrl, setQUrl] = useUrlState("q", "");
  const [hizmet, setHizmet] = useUrlState("hizmet", "all");
  const [kalan, setKalan] = useUrlState("kalan", "all");
  const [odeme, setOdeme] = useUrlState("odeme", "all");
  const [deger, setDeger] = useUrlState("deger", "all");
  const [iletisim, setIletisim] = useUrlState("iletisim", "all");
  const [etiket, setEtiket] = useUrlState("etiket", "all");
  const fv: Record<string, string> = { hizmet, kalan, odeme, deger, iletisim, etiket };
  const setters: Record<string, (v: string) => void> = {
    hizmet: setHizmet,
    kalan: setKalan,
    odeme: setOdeme,
    deger: setDeger,
    iletisim: setIletisim,
    etiket: setEtiket,
  };

  // Arama alanı anında yanıt verir; adres çubuğu biraz gecikmeyle güncellenir.
  const [q, setQ] = useState(qUrl);
  const qUrlRef = useRef({ qUrl, setQUrl });
  useEffect(() => {
    qUrlRef.current = { qUrl, setQUrl };
  });
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== qUrlRef.current.qUrl) qUrlRef.current.setQUrl(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const [selId, setSelId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspectorOn, setInspectorOn] = useState(true);
  // "Yeni müşteri" komut paletinden / başka sayfadan ?yeni=1 ile de açılır.
  const yeniParam = params.get("yeni");
  const [createOpenLocal, setCreateOpenLocal] = useState(false);
  const createOpen = createOpenLocal || (abilities.add && yeniParam === "1");
  const setCreateOpen = (open: boolean) => {
    setCreateOpenLocal(open);
    // Sunucuya gitmeden adresten sil (router.replace sayfayı yeniden çizdirir).
    if (!open && yeniParam) {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("yeni");
      const qs = sp.toString();
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  };
  // Form panelleri: kapanırken çıkış animasyonu oynasın diye açık/kapalı ayrı tutulur.
  const [book, setBook] = useState<{ id: string; open: boolean } | null>(null);
  const [pay, setPay] = useState<{ id: string; open: boolean } | null>(null);
  const setBookId = (id: string) => setBook({ id, open: true });
  const setPayId = (id: string) => setPay({ id, open: true });

  const showMoney = abilities.pay;

  const counts = useMemo(() => {
    const x = { aktif: 0, pasif: 0, arsiv: 0 };
    for (const c of customers) x[groupOf(c)]++;
    return x;
  }, [customers]);

  const defs: FilterDef[] = useMemo(() => {
    const svc = [...new Set(customers.map((c) => c.service).filter((s): s is string => !!s))].sort((a, b) =>
      a.localeCompare(b, "tr")
    );
    return [
      { key: "hizmet", label: "Hizmet", options: svc.map((s) => ({ value: s, label: s })) },
      {
        key: "kalan",
        label: "Kalan seans",
        options: [
          { value: "var", label: "Seansı var" },
          { value: "az", label: "Az kaldı" },
          { value: "bitti", label: "Paketi bitti" },
        ],
      },
      ...(showMoney
        ? [
            {
              key: "odeme",
              label: "Ödeme",
              options: [
                { value: "borc", label: "Açık borç" },
                { value: "gecikmis", label: "Gecikmiş borç" },
              ],
            },
            {
              key: "deger",
              label: "Değer",
              advanced: true,
              options: [
                { value: "low", label: "5.000 TL altı" },
                { value: "mid", label: "5.000 – 15.000 TL" },
                { value: "high", label: "15.000 TL üstü" },
              ],
            },
          ]
        : []),
      {
        key: "iletisim",
        label: "Son iletişim",
        advanced: true,
        options: [
          { value: "today", label: "Bugün" },
          { value: "week", label: "Son 7 gün" },
          { value: "month", label: "Son 30 gün" },
          { value: "none", label: "Hiç iletişim yok" },
        ],
      },
      { key: "etiket", label: "Etiket", advanced: true, options: tags.map((t) => ({ value: t, label: t })) },
    ];
  }, [customers, tags, showMoney]);

  const activeFilters = defs.filter((d) => (fv[d.key] ?? "all") !== "all");

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    const digits = s.replace(/\D/g, "");
    return customers.filter((c) => {
      if (groupOf(c) !== scope) return false;
      if (s) {
        const hay = `${c.full_name} ${c.email ?? ""}`.toLocaleLowerCase("tr");
        const phoneHit = digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits);
        if (!hay.includes(s) && !phoneHit) return false;
      }
      if (hizmet !== "all" && c.service !== hizmet) return false;
      if (kalan !== "all") {
        const r = c.remaining ?? -1;
        if (kalan === "var" && !(r > 0)) return false;
        if (kalan === "az" && !(r > 0 && r <= 2)) return false;
        if (kalan === "bitti" && !(c.total != null && r === 0)) return false;
      }
      if (showMoney && odeme !== "all") {
        if (odeme === "borc" && !(c.openDebt > 0)) return false;
        if (odeme === "gecikmis" && !(c.openDebt > 0 && c.overdue)) return false;
      }
      if (showMoney && deger !== "all") {
        const v = c.totalValue;
        if (deger === "low" && !(v < 5000)) return false;
        if (deger === "mid" && !(v >= 5000 && v < 15000)) return false;
        if (deger === "high" && !(v >= 15000)) return false;
      }
      if (iletisim !== "all") {
        const d = c.lastContactAt ? Math.floor((nowMs - new Date(c.lastContactAt).getTime()) / DAY) : null;
        if (iletisim === "today" && d !== 0) return false;
        if (iletisim === "week" && !(d !== null && d <= 7)) return false;
        if (iletisim === "month" && !(d !== null && d <= 30)) return false;
        if (iletisim === "none" && d !== null) return false;
      }
      if (etiket !== "all" && !(c.tags ?? []).includes(etiket)) return false;
      return true;
    });
  }, [customers, scope, q, hizmet, kalan, odeme, deger, iletisim, etiket, nowMs, showMoney]);

  const effSel = filtered.find((c) => c.id === selId)?.id ?? filtered[0]?.id ?? null;
  const asideCustomer = customers.find((c) => c.id === effSel) ?? null;
  const sheetCustomer = customers.find((c) => c.id === selId) ?? null;
  const bookCustomer = customers.find((c) => c.id === book?.id) ?? null;
  const payCustomer = customers.find((c) => c.id === pay?.id) ?? null;

  function openCustomer(c: EnrichedCustomer) {
    setSelId(c.id);
    if (!window.matchMedia(XL_QUERY).matches) setSheetOpen(true);
  }

  function clearFilters() {
    const sp = new URLSearchParams(params.toString());
    for (const k of FILTER_KEYS) sp.delete(k);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearSearch() {
    setQ("");
    setQUrl("");
  }

  function exportCsv() {
    const headers = ["Ad Soyad", "Telefon", "E-posta", "Hizmet", "Kullanılan Seans", "Toplam Seans", "Toplam Ödeme", "Açık Borç", "Son İletişim", "Durum"];
    const lines = filtered.map((c) =>
      [
        c.full_name,
        c.phone ?? "",
        c.email ?? "",
        c.service ?? "",
        c.total != null && c.remaining != null ? c.total - c.remaining : "",
        c.total ?? "",
        c.totalValue,
        c.openDebt,
        relTime(c.lastContactAt, nowMs),
        customerStatusLabel(c.status),
      ]
        .map(csvCell)
        .join(",")
    );
    const csv = "﻿" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<EnrichedCustomer>[] = [
    {
      key: "ad",
      header: "Müşteri",
      sortValue: (c) => c.full_name,
      cell: (c) => (
        <span className="flex min-w-0 max-w-[17rem] items-center gap-2.5">
          <Avatar name={c.full_name} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="truncate" title={c.full_name}>
                {c.full_name}
              </span>
              {(c.tags ?? []).slice(0, 2).map((t) => (
                <Badge key={t} variant="tag">
                  {t}
                </Badge>
              ))}
            </span>
            <span className="block truncate text-[0.75rem] text-label-2 tabular-nums">{c.phone ?? "Telefon yok"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "paket",
      header: "Paket",
      hideBelow: "@2xl",
      sortValue: (c) => (c.total != null && c.remaining != null ? c.remaining : null),
      cell: (c) =>
        c.total != null && c.remaining != null ? (
          <PackageProgress
            label={c.service ?? "Paket"}
            used={Math.max(c.total - c.remaining, 0)}
            total={c.total}
            className="min-w-[8rem]"
          />
        ) : (
          <span className="text-label-2">Paket yok</span>
        ),
    },
    {
      key: "sonraki",
      header: "Sıradaki randevu",
      hideBelow: "@3xl",
      sortValue: (c) => (c.nextAppt ? new Date(c.nextAppt.startsAt).getTime() : null),
      cell: (c) => {
        if (!c.nextAppt) return <span className="text-label-2">Randevu yok</span>;
        const w = apptWhen(c.nextAppt.startsAt, nowMs);
        return (
          <span>
            <span className={cn("flex items-center gap-1.5 whitespace-nowrap", w.today && "font-semibold")}>
              {w.day} {w.time}
              {c.nextAppt.status === "arrived" && <StatusBadge variant="positive">Geldi</StatusBadge>}
            </span>
            <span className="block max-w-[10rem] truncate text-[0.75rem] text-label-2">
              {c.nextAppt.staffName ?? c.nextAppt.serviceName ?? ""}
            </span>
          </span>
        );
      },
    },
    {
      key: "iletisim",
      header: "Son iletişim",
      hideBelow: "@4xl",
      sortValue: (c) => (c.lastContactAt ? new Date(c.lastContactAt).getTime() : null),
      cell: (c) => (
        <span>
          <span className="block whitespace-nowrap">{relTime(c.lastContactAt, nowMs)}</span>
          {c.lastContactType && (
            <span className="block text-[0.75rem] text-label-2">{INTERACTION_LABEL[c.lastContactType] ?? ""}</span>
          )}
        </span>
      ),
    },
    ...(showMoney
      ? [
          {
            key: "deger",
            header: "Değer",
            align: "right" as const,
            sortValue: (c: EnrichedCustomer) => c.totalValue,
            cell: (c: EnrichedCustomer) => (
              <span className="flex flex-col items-end">
                <Money amount={c.totalValue} tone={c.totalValue > 0 ? "default" : "muted"} />
                {c.openDebt > 0 && (
                  <Money
                    amount={c.openDebt}
                    tone="debt"
                    overdue={c.overdue}
                    suffix={c.overdue ? "gecikmiş" : "borç"}
                    className="text-[0.75rem]"
                  />
                )}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "durum",
      header: "Durum",
      hideBelow: "@5xl",
      cell: (c) => <StatusDot variant={customerStatusVariant(c.status)}>{customerStatusLabel(c.status)}</StatusDot>,
    },
  ];

  function mobileRow(c: EnrichedCustomer) {
    const pk =
      c.total != null && c.remaining != null
        ? c.total <= 1
          ? "Tek seans"
          : c.remaining === 0
            ? "Paketi bitti"
            : `${c.remaining} seans kaldı`
        : "Paket yok";
    const trailing = [
      ...(c.phone
        ? [
            {
              label: "Ara",
              icon: PhoneIcon,
              tone: "neutral" as const,
              onAction: () => {
                window.location.href = telHref(c.phone as string);
              },
            },
          ]
        : []),
      ...(abilities.pay
        ? [{ label: "Ödeme al", icon: BanknoteIcon, tone: "primary" as const, onAction: () => setPayId(c.id) }]
        : []),
    ];
    return (
      <SwipeRow trailing={trailing}>
        <Link
          href={`/musteriler/${c.id}`}
          className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover active:bg-press focus-visible:outline-offset-[-3px]"
        >
          <Avatar name={c.full_name} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[1rem] leading-[1.3125rem] font-semibold">{c.full_name}</span>
              {/* Telefonda ad önce gelir: uzun etiket adı kesmesin diye yalnızca kısa etiket (VIP, Taksitli…) */}
              {(c.tags ?? []).filter((t) => t.length <= 10).slice(0, 1).map((t) => (
                <Badge key={t} variant="tag">
                  {t}
                </Badge>
              ))}
            </span>
            <span className="flex items-baseline justify-between gap-2.5 text-[0.875rem] text-label-2">
              <span className="min-w-0 truncate">
                {c.service ? `${c.service} · ${pk}` : pk}
              </span>
              {showMoney && c.totalValue > 0 && <Money amount={c.totalValue} tone="muted" className="shrink-0" />}
            </span>
            {showMoney && c.openDebt > 0 && (
              <Money
                amount={c.openDebt}
                tone="debt"
                overdue={c.overdue}
                suffix={c.overdue ? "gecikmiş borç" : "açık borç"}
                className="text-[0.875rem]"
              />
            )}
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />
        </Link>
      </SwipeRow>
    );
  }

  const searchField = (variant: "glass" | "fill") => (
    <SearchField
      variant={variant}
      value={q}
      onValueChange={setQ}
      placeholder="Müşteri ara"
      aria-label="Müşteri ara"
      className={variant === "glass" ? "w-[16rem] lg:w-[19rem]" : undefined}
    />
  );

  const header = (
    <PageHeader
      title="Müşteriler"
      description={`Toplam ${nf(customers.length)} müşteri`}
      search={searchField("glass")}
      secondary={
        <CustomerFilters
          defs={defs}
          values={fv}
          onChange={(k, v) => setters[k]?.(v)}
          activeCount={activeFilters.length}
        />
      }
      primary={
        abilities.add ? (
          <ToolbarAction prominent icon={Plus} label="Yeni müşteri" onClick={() => setCreateOpen(true)} />
        ) : undefined
      }
    />
  );

  if (loadFailed) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          title="Müşteriler yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Biraz sonra tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Users}
          title="Henüz müşteri yok"
          description={
            abilities.add
              ? "İlk müşterinizi ekleyin. Randevu, paket ve ödemeler müşteri kartında bir arada durur."
              : "Müşterileri yönetici ya da resepsiyon ekler. Eklendiklerinde burada görünür."
          }
          action={
            abilities.add ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Yeni müşteri
              </Button>
            ) : undefined
          }
        />
        <CustomerCreateSheet open={createOpen} onOpenChange={setCreateOpen} services={serviceNames} tags={tags} />
      </div>
    );
  }

  const nResultFilters = activeFilters.length + (q.trim() ? 1 : 0);
  const hasSwipe = filtered.length > 0 && (abilities.pay || filtered.some((c) => c.phone));

  return (
    <div className="space-y-6">
      {header}

      <MetricStrip aria-label="Müşteri özeti">
        <Metric label="Aktif müşteri" value={nf(metrics.active)} context={`${nf(customers.length)} kayıttan`} />
        <Metric label="Bu ay seans" value={nf(metrics.monthSessions)} context="bu ay tamamlanan" />
        <Metric label="Yeni müşteri" value={nf(metrics.newThisMonth)} context="bu ay eklenen" />
        {showMoney && (
          <Metric
            label="Açık borç"
            value={formatMoney(metrics.openDebt)}
            tone={metrics.openDebt > 0 ? "danger" : undefined}
            href="/cari"
            flag={metrics.overdueCount > 0 ? `${metrics.overdueCount} gecikmiş` : undefined}
            context={metrics.debtorCount > 0 ? `${nf(metrics.debtorCount)} müşteri` : "borç yok"}
          />
        )}
      </MetricStrip>

      <div className="space-y-3">
        <div className="md:hidden">{searchField("fill")}</div>
        <FilterBar
          scope={{
            "aria-label": "Müşteri durumu",
            value: scope,
            onValueChange: setScope,
            items: [
              { value: "aktif", label: "Aktif", count: counts.aktif },
              { value: "pasif", label: "Pasif", count: counts.pasif },
              { value: "arsiv", label: "Arşiv", count: counts.arsiv },
            ],
          }}
          tokens={activeFilters.map((d) => {
            const opt = d.options.find((o) => o.value === fv[d.key])?.label ?? fv[d.key];
            return {
              key: d.key,
              label: opt,
              title: `${d.label}: ${opt}`,
              onRemove: () => setters[d.key]?.("all"),
            };
          })}
          onClearAll={clearFilters}
          result={`${nf(filtered.length)} müşteri`}
          actions={
            <>
              {abilities.manage && (
                <Button variant="plain" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
                  <Download />
                  Dışa aktar
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden xl:inline-flex"
                aria-pressed={inspectorOn}
                aria-label={inspectorOn ? "Ayrıntı bölmesini kapat" : "Ayrıntı bölmesini aç"}
                title={inspectorOn ? "Ayrıntı bölmesini kapat" : "Ayrıntı bölmesini aç"}
                onClick={() => setInspectorOn((v) => !v)}
              >
                <PanelRight className={cn(inspectorOn && "text-primary-text")} />
              </Button>
            </>
          }
        />
        {hasSwipe && (
          <p className="text-subhead text-label-2w md:hidden">
            {abilities.pay ? "Ara ve Ödeme al için satırı sola kaydırın" : "Aramak için satırı sola kaydırın"}
          </p>
        )}
        {limited && (
          <p className="text-subhead text-label-2w">
            Liste en yeni {nf(limit)} müşteriyle sınırlı.
          </p>
        )}
      </div>

      <div className={cn("grid items-start gap-5", inspectorOn && "xl:grid-cols-[minmax(0,1fr)_23rem]")}>
        <DataTable
          caption="Müşteriler"
          columns={columns}
          rows={filtered}
          getRowId={(c) => c.id}
          activeId={isPhone ? null : isXl ? (inspectorOn ? effSel : null) : sheetOpen ? selId : null}
          onRowActivate={openCustomer}
          renderMobileRow={mobileRow}
          empty={
            <EmptyState
              variant="inline"
              icon={Search}
              title={q.trim() || activeFilters.length ? "Sonuç yok" : "Bu sekmede müşteri yok"}
              description={
                q.trim()
                  ? `“${q.trim()}” ile eşleşen müşteri yok. Yazımı kontrol edin ya da telefonun son hanelerini yazın.`
                  : activeFilters.length
                    ? "Seçili filtrelere uyan müşteri yok. Filtreleri kaldırıp tekrar deneyin."
                    : "Durumu değiştirilen müşteriler ilgili sekmede görünür."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {q.trim() ? (
                    <Button variant="secondary" onClick={clearSearch}>
                      Aramayı temizle
                    </Button>
                  ) : activeFilters.length ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Filtreleri temizle
                    </Button>
                  ) : scope !== "aktif" ? (
                    <Button variant="secondary" onClick={() => setScope("aktif")}>
                      Aktif müşterilere dön
                    </Button>
                  ) : null}
                  {abilities.add && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus />
                      Yeni müşteri
                    </Button>
                  )}
                </div>
              }
            />
          }
          footer={<span>{nf(filtered.length)} müşteri</span>}
        />

        {inspectorOn && (
          <aside
            aria-label="Müşteri ayrıntısı"
            className="hidden max-h-[calc(100dvh-var(--toolbar-h)-2rem)] overflow-y-auto overscroll-contain xl:sticky xl:top-[calc(var(--toolbar-h)+1rem)] xl:block"
          >
            {asideCustomer ? (
              <CustomerPane
                key={asideCustomer.id}
                customer={asideCustomer}
                abilities={abilities}
                canArrive={canArrive}
                nowMs={nowMs}
                onBook={() => setBookId(asideCustomer.id)}
                onPay={() => setPayId(asideCustomer.id)}
              />
            ) : (
              <EmptyState
                icon={UserRound}
                title="Müşteri seçin"
                description="Ayrıntıları görmek için listeden bir müşteri seçin."
              />
            )}
          </aside>
        )}
      </div>

      {/* 768–1279: ayrıntı sağdan açılan panelde */}
      <Sheet open={sheetOpen && !isXl && !isPhone && !!sheetCustomer} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-[26rem]">
          <SheetHeader>
            <SheetTitle>Müşteri ayrıntısı</SheetTitle>
            <SheetDescription className="sr-only">Seçili müşterinin paket, randevu ve ödeme durumu</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {sheetCustomer && (
              <CustomerPane
                key={sheetCustomer.id}
                customer={sheetCustomer}
                abilities={abilities}
                canArrive={canArrive}
                nowMs={nowMs}
                onBook={() => setBookId(sheetCustomer.id)}
                onPay={() => setPayId(sheetCustomer.id)}
                onDeleted={() => {
                  setSheetOpen(false);
                  router.refresh();
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CustomerCreateSheet open={createOpen} onOpenChange={setCreateOpen} services={serviceNames} tags={tags} />
      {bookCustomer && (
        <AppointmentSheet
          customer={bookCustomer}
          open={!!book?.open}
          onOpenChange={(o) => !o && setBook((b) => b && { ...b, open: false })}
          services={services}
          staff={staff}
          packages={packages}
        />
      )}
      {payCustomer && (
        <PaymentSheet
          customer={payCustomer}
          open={!!pay?.open}
          onOpenChange={(o) => !o && setPay((p) => p && { ...p, open: false })}
          packages={packages}
        />
      )}
      <span className="sr-only" aria-live="polite">
        {nResultFilters > 0 ? `${filtered.length} sonuç` : ""}
      </span>
    </div>
  );
}
