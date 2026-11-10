"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, ChevronLeft, ChevronRight, ListFilter, Plus, Search, ShoppingBag, Users } from "lucide-react";

import { derivePaymentStatus, paymentMethodLabel, paymentMethodVariant, paymentStatusLabel, paymentStatusVariant, PAYMENT_METHODS } from "@/lib/constants";
import type { DebtSummary } from "@/lib/balances";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { formatMoney, Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge, StatusDot } from "@/components/shared/status";
import { SwipeRow } from "@/components/shared/swipe-row";

import { isRangeKind, parseDateKey, resolveRange, shiftAnchor, toDateKey, type RangeKind } from "../randevular/date-range";
import { useRandevuParams } from "../randevular/use-randevu-params";
import type { CustomerOption, PackageOption } from "./payment-form";
import { PaymentSheet } from "./payment-sheet";
import { SalesChart } from "./sales-chart";
import type { PaymentRow, SaleRow } from "./types";

const noopSubscribe = () => () => {};
/** Sunucuda false, istemcide true: tarihe bağlı içerik hydration uyuşmazlığı yaratmasın. */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const RELATED_LABEL: Record<string, string> = { paket: "Paket", randevu: "Randevu", diger: "Diğer" };

type List = "satis" | "tahsilat";
const DURUM_OPTIONS = [
  { value: "odendi", label: "Ödendi" },
  { value: "kismi", label: "Kısmi" },
  { value: "odenmedi", label: "Ödenmedi" },
] as const;

function saleStatus(s: SaleRow): string | null {
  return s.kind === "Paket" ? derivePaymentStatus(s.amount, s.amount - s.remaining) : null;
}

/** Önceki dönem (İstanbul günüyle): ay için bir önceki ay, diğerlerinde aynı uzunlukta hemen önceki aralık. */
function previousRange(kind: RangeKind, start: Date, end: Date, today: Date): { start: Date; end: Date } {
  if (kind === "ay") return resolveRange("ay", shiftAnchor("ay", toDateKey(start), -1, today), null, null, today);
  return { start: new Date(start.getTime() - (end.getTime() - start.getTime())), end: start };
}

function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function CustomerCell({ id, name }: { id: string | null; name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size="sm" />
      {id ? (
        <Link href={`/musteriler/${id}`} className="min-w-0 truncate font-medium hover:text-primary-text hover:underline" title={name}>
          {name}
        </Link>
      ) : (
        <span className="min-w-0 truncate font-medium" title={name}>
          {name}
        </span>
      )}
    </span>
  );
}

export function SalesView({
  sales,
  payments,
  customers,
  packages,
  debt,
  canPay,
  loadFailed,
}: {
  sales: SaleRow[];
  payments: PaymentRow[];
  customers: CustomerOption[];
  packages: PackageOption[];
  /** Açık alacak: tüm ekranlarla aynı kaynak (`customer_balances`). */
  debt: DebtSummary;
  canPay: boolean;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const { params, set } = useRandevuParams();

  const [today] = useState(() => new Date());
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [payInit, setPayInit] = useState<{ customer_id?: string; package_id?: string; amount?: string } | null>(null);

  const createOpen = canPay && params.get("yeni") === "1";
  const payOpen = createOpen || payInit !== null;

  // ---- URL'deki durum ----
  const kind: RangeKind = isRangeKind(params.get("aralik")) ? (params.get("aralik") as RangeKind) : "ay";
  const range = useMemo(
    () => resolveRange(kind, params.get("tarih"), params.get("bas"), params.get("bit"), today),
    [kind, params, today]
  );
  const list: List = params.get("liste") === "tahsilat" ? "tahsilat" : "satis";
  const tur = params.get("tur") === "Paket" || params.get("tur") === "Hizmet" ? (params.get("tur") as string) : "all";
  const odeme = DURUM_OPTIONS.some((d) => d.value === params.get("odeme")) ? (params.get("odeme") as string) : "all";
  const yontem = PAYMENT_METHODS.some((m) => m.value === params.get("yontem")) ? (params.get("yontem") as string) : "all";

  // ---- Dönem verisi ----
  const inRange = (iso: string, from: Date, to: Date) => {
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t < to.getTime();
  };
  const prev = useMemo(() => previousRange(kind, range.start, range.end, today), [kind, range, today]);

  const salesIn = useMemo(() => sales.filter((s) => inRange(s.date, range.start, range.end)), [sales, range]);
  const paymentsIn = useMemo(() => payments.filter((p) => inRange(p.created_at, range.start, range.end)), [payments, range]);

  const metrics = useMemo(() => {
    const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + x.amount, 0);
    const salesTotal = sum(salesIn);
    const salesPrev = sum(sales.filter((s) => inRange(s.date, prev.start, prev.end)));
    const collected = sum(paymentsIn);
    const collectedPrev = sum(payments.filter((p) => inRange(p.created_at, prev.start, prev.end)));
    const by = (m: string) => sum(paymentsIn.filter((p) => p.method === m));
    const other = [
      ["Kart", by("kart")],
      ["Havale", by("havale")],
      ["Diğer", by("diger")],
    ].filter(([, v]) => (v as number) > 0);
    return {
      salesTotal,
      salesDelta: pctChange(salesTotal, salesPrev),
      collected,
      collectedDelta: pctChange(collected, collectedPrev),
      cash: by("nakit"),
      otherText: other.map(([l, v]) => `${l} ${formatMoney(v as number)}`).join(" · "),
    };
  }, [salesIn, paymentsIn, sales, payments, prev]);

  // ---- Süzme ----
  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const salesSearched = useMemo(
    () => salesIn.filter((s) => !needle || `${s.customer} ${s.item}`.toLocaleLowerCase("tr-TR").includes(needle)),
    [salesIn, needle]
  );
  const paymentsSearched = useMemo(
    () => paymentsIn.filter((p) => !needle || `${p.customer} ${p.note ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle)),
    [paymentsIn, needle]
  );
  const salesRows = useMemo(
    () =>
      salesSearched.filter((s) => {
        if (tur !== "all" && s.kind !== tur) return false;
        if (odeme !== "all" && saleStatus(s) !== odeme) return false;
        return true;
      }),
    [salesSearched, tur, odeme]
  );
  const paymentRows = useMemo(
    () => paymentsSearched.filter((p) => yontem === "all" || p.method === yontem),
    [paymentsSearched, yontem]
  );

  const filterCount = list === "satis" ? (tur !== "all" ? 1 : 0) + (odeme !== "all" ? 1 : 0) : yontem !== "all" ? 1 : 0;
  const hasFilters = filterCount > 0 || q.trim() !== "";

  function clearFilters() {
    setQ("");
    set({ q: null, tur: null, odeme: null, yontem: null });
  }

  // ---- Tarih aralığı denetimi ----
  function changeKind(next: RangeKind) {
    const lastDay = new Date(range.end.getTime() - 1);
    set({
      aralik: next === "ay" ? null : next,
      tarih: null,
      bas: next === "ozel" ? toDateKey(range.start) : null,
      bit: next === "ozel" ? toDateKey(lastDay) : null,
    });
  }
  function shift(dir: -1 | 1) {
    set({ tarih: shiftAnchor(kind, params.get("tarih"), dir, today) });
  }

  // ---- Ödeme al ----
  function openPay(init?: { customer_id: string; package_id?: string; amount?: string }) {
    if (init) setPayInit(init);
    else set({ yeni: "1" });
  }
  function closePay() {
    setPayInit(null);
    if (params.get("yeni")) set({ yeni: null });
  }
  function collect(s: SaleRow) {
    if (!s.customerId || !s.packageId) return;
    openPay({ customer_id: s.customerId, package_id: s.packageId, amount: String(Math.round(s.remaining * 100) / 100) });
  }
  const collectible = (s: SaleRow) => canPay && s.kind === "Paket" && s.remaining > 0 && !!s.customerId && !!s.packageId;

  const sheetCustomers = useMemo(() => {
    const id = payInit?.customer_id;
    if (!id || customers.some((c) => c.id === id)) return customers;
    const name = sales.find((s) => s.customerId === id)?.customer ?? "Müşteri";
    return [{ id, full_name: name }, ...customers];
  }, [customers, payInit, sales]);

  // ---- Tablolar ----
  const saleColumns: DataTableColumn<SaleRow>[] = [
    {
      key: "date",
      header: "Tarih",
      sortValue: (s) => new Date(s.date).getTime(),
      cell: (s) => <span className="whitespace-nowrap tabular-nums text-label-2">{formatDate(s.date)}</span>,
    },
    {
      key: "customer",
      header: "Müşteri",
      sortValue: (s) => s.customer,
      cell: (s) => <CustomerCell id={s.customerId} name={s.customer} />,
    },
    {
      key: "item",
      header: "Satılan",
      hideBelow: "@2xl",
      sortValue: (s) => s.item,
      cell: (s) => (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="block max-w-[14rem] truncate" title={s.item}>
            {s.item}
          </span>
          <span className="shrink-0 text-subhead whitespace-nowrap text-label-2">{s.kind}</span>
        </span>
      ),
    },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      sortValue: (s) => s.amount,
      cell: (s) => <Money amount={s.amount} />,
    },
    {
      key: "status",
      header: "Ödeme",
      sortValue: (s) => saleStatus(s) ?? "z",
      cell: (s) => {
        const st = saleStatus(s);
        return st ? (
          <StatusBadge variant={paymentStatusVariant(st)}>{paymentStatusLabel(st)}</StatusBadge>
        ) : (
          <StatusBadge variant="positive">Tamamlandı</StatusBadge>
        );
      },
    },
    {
      key: "remaining",
      header: "Kalan",
      align: "right",
      hideBelow: "@3xl",
      sortValue: (s) => s.remaining,
      cell: (s) => (s.remaining > 0 ? <Money amount={s.remaining} tone="debt" /> : <span className="text-label-3">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (s) =>
        collectible(s) ? (
          <Button variant="tinted" size="sm" onClick={() => collect(s)} aria-label={`${s.customer} için ödeme al`}>
            <Banknote />
            Ödeme al
          </Button>
        ) : null,
    },
  ];

  const paymentColumns: DataTableColumn<PaymentRow>[] = [
    {
      key: "date",
      header: "Tarih",
      sortValue: (p) => new Date(p.created_at).getTime(),
      cell: (p) => <span className="whitespace-nowrap tabular-nums text-label-2">{formatDate(p.created_at)}</span>,
    },
    {
      key: "customer",
      header: "Müşteri",
      sortValue: (p) => p.customer,
      cell: (p) => <CustomerCell id={p.customerId} name={p.customer} />,
    },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      sortValue: (p) => p.amount,
      cell: (p) => <Money amount={p.amount} />,
    },
    {
      key: "method",
      header: "Yöntem",
      sortValue: (p) => paymentMethodLabel(p.method),
      cell: (p) => <StatusDot variant={paymentMethodVariant(p.method)}>{paymentMethodLabel(p.method)}</StatusDot>,
    },
    {
      key: "related",
      header: "Ne için",
      hideBelow: "@2xl",
      sortValue: (p) => p.related_type ?? "",
      cell: (p) => <span className="text-label-2">{p.related_type ? (RELATED_LABEL[p.related_type] ?? "—") : "—"}</span>,
    },
    {
      key: "note",
      header: "Not",
      hideBelow: "@3xl",
      cell: (p) => (
        <span className="block max-w-[16rem] truncate text-label-2" title={p.note ?? undefined}>
          {p.note ?? "—"}
        </span>
      ),
    },
  ];

  function renderSaleRow(s: SaleRow) {
    const st = saleStatus(s);
    const can = collectible(s);
    const sub = [s.item, formatDate(s.date)].join(" · ");
    return (
      <SwipeRow
        trailing={
          can ? [{ label: "Ödeme al", icon: Banknote, tone: "primary", onAction: () => collect(s) }] : []
        }
      >
        <div className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
          <span className="min-w-0 flex-1">
            {s.customerId ? (
              <Link href={`/musteriler/${s.customerId}`} className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">
                {s.customer}
              </Link>
            ) : (
              <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{s.customer}</span>
            )}
            <span className="block truncate text-subhead text-label-2" title={sub}>
              {sub}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Money amount={s.amount} className="text-[0.9375rem] font-semibold" />
            {can ? (
              <Button variant="tinted" size="xs" onClick={() => collect(s)} aria-label={`${s.customer} için ödeme al`}>
                Ödeme al
              </Button>
            ) : st ? (
              <StatusBadge variant={paymentStatusVariant(st)}>{paymentStatusLabel(st)}</StatusBadge>
            ) : (
              <StatusBadge variant="positive">Tamamlandı</StatusBadge>
            )}
          </span>
        </div>
      </SwipeRow>
    );
  }

  function renderPaymentRow(p: PaymentRow) {
    const sub = [paymentMethodLabel(p.method), formatDate(p.created_at)].join(" · ");
    return (
      <div className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
        <span className="min-w-0 flex-1">
          {p.customerId ? (
            <Link href={`/musteriler/${p.customerId}`} className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">
              {p.customer}
            </Link>
          ) : (
            <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{p.customer}</span>
          )}
          <span className="block truncate text-subhead text-label-2">{sub}</span>
        </span>
        <Money amount={p.amount} className="shrink-0 text-[0.9375rem] font-semibold" />
      </div>
    );
  }

  // ---- Boş durumlar ----
  const noCustomers = customers.length === 0;
  const payAction = canPay && !noCustomers ? (
    <Button onClick={() => openPay()}>
      <Plus />
      Ödeme al
    </Button>
  ) : undefined;

  const filteredEmpty = (
    <EmptyState
      variant="inline"
      icon={Search}
      title="Sonuç yok"
      description="Aramaya ve filtrelere uyan kayıt yok. Filtreleri temizleyip tekrar deneyin."
      action={
        <Button variant="secondary" onClick={clearFilters}>
          Filtreleri temizle
        </Button>
      }
    />
  );

  const rangeEmpty = (what: string) => (
    <EmptyState
      variant="inline"
      icon={ShoppingBag}
      title={`Bu aralıkta ${what} yok`}
      description={canPay ? "Başka bir tarih aralığı seçin ya da ödeme alın." : "Başka bir tarih aralığı seçerek diğer kayıtlara bakabilirsiniz."}
      action={payAction}
    />
  );

  const allEmpty = sales.length === 0 && payments.length === 0;
  const activeIn = list === "satis" ? salesIn : paymentsIn;
  const empty = activeIn.length === 0 ? rangeEmpty(list === "satis" ? "satış" : "tahsilat") : filteredEmpty;

  // ---- Başlık çubuğu ----
  const gun = range.includesToday;
  const rangeItems = [
    { value: "gun", label: kind === "gun" && !gun ? "Gün" : "Bugün" },
    { value: "hafta", label: kind === "hafta" && !gun ? "Hafta" : "Bu hafta" },
    { value: "ay", label: kind === "ay" && !gun ? "Ay" : "Bu ay" },
    { value: "ozel", label: "Özel aralık" },
  ] as const;

  const context = mounted ? (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <SegmentedControl
        aria-label="Tarih aralığı"
        items={rangeItems}
        value={kind}
        onValueChange={changeKind}
        fullWidth
        className="md:w-auto"
      />
      {kind === "ozel" ? (
        <div className="flex min-w-0 items-center gap-2">
          <Input
            type="date"
            aria-label="Başlangıç tarihi"
            className="min-w-0 flex-1 md:w-40 md:flex-none"
            value={params.get("bas") ?? toDateKey(range.start)}
            max={params.get("bit") ?? undefined}
            onChange={(e) => parseDateKey(e.target.value) && set({ bas: e.target.value })}
          />
          <span aria-hidden className="text-label-2">
            –
          </span>
          <Input
            type="date"
            aria-label="Bitiş tarihi"
            className="min-w-0 flex-1 md:w-40 md:flex-none"
            value={params.get("bit") ?? toDateKey(new Date(range.end.getTime() - 1))}
            min={params.get("bas") ?? undefined}
            onChange={(e) => parseDateKey(e.target.value) && set({ bit: e.target.value })}
          />
        </div>
      ) : (
        <div className="flex min-w-0 items-center justify-between gap-1 md:justify-start">
          <Button variant="glass" size="icon-sm" aria-label="Önceki" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <span aria-live="polite" className="min-w-[8.5rem] px-2 text-center text-[0.9375rem] font-semibold whitespace-nowrap">
            {cap(range.label)}
          </span>
          <Button variant="glass" size="icon-sm" aria-label="Sonraki" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  ) : undefined;

  const filterPopover = (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarAction icon={ListFilter} label="Filtrele" mobile="icon" badge={filterCount || undefined} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[19rem] space-y-3">
        {list === "satis" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="f-tur">Tür</Label>
              <Select value={tur} onValueChange={(v) => set({ tur: v === "all" ? null : v })}>
                <SelectTrigger id="f-tur" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm türler</SelectItem>
                  <SelectItem value="Paket">Paket</SelectItem>
                  <SelectItem value="Hizmet">Hizmet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-odeme">Ödeme durumu</Label>
              <Select value={odeme} onValueChange={(v) => set({ odeme: v === "all" ? null : v })}>
                <SelectTrigger id="f-odeme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm durumlar</SelectItem>
                  {DURUM_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="f-yontem">Ödeme yöntemi</Label>
            <Select value={yontem} onValueChange={(v) => set({ yontem: v === "all" ? null : v })}>
              <SelectTrigger id="f-yontem" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm yöntemler</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {filterCount > 0 && (
          <Button variant="plain" size="sm" onClick={() => set({ tur: null, odeme: null, yontem: null })}>
            Filtreleri temizle
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );

  const tokens =
    list === "satis"
      ? [
          ...(tur !== "all" ? [{ key: "tur", label: tur, title: `Tür: ${tur}`, onRemove: () => set({ tur: null }) }] : []),
          ...(odeme !== "all"
            ? [
                {
                  key: "odeme",
                  label: paymentStatusLabel(odeme),
                  title: `Ödeme durumu: ${paymentStatusLabel(odeme)}`,
                  onRemove: () => set({ odeme: null }),
                },
              ]
            : []),
        ]
      : yontem !== "all"
        ? [
            {
              key: "yontem",
              label: paymentMethodLabel(yontem),
              title: `Ödeme yöntemi: ${paymentMethodLabel(yontem)}`,
              onRemove: () => set({ yontem: null }),
            },
          ]
        : [];

  const chartItems = useMemo(
    () =>
      list === "satis"
        ? salesIn.map((s) => ({ at: s.date, amount: s.amount }))
        : paymentsIn.map((p) => ({ at: p.created_at, amount: p.amount })),
    [list, salesIn, paymentsIn]
  );
  const delta = (v: number | null) => (v == null ? {} : { delta: v, context: "önceki döneme göre" });
  const total = list === "satis" ? salesRows.reduce((a, s) => a + s.amount, 0) : paymentRows.reduce((a, p) => a + p.amount, 0);
  const count = list === "satis" ? salesRows.length : paymentRows.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Satışlar"
        description="Satışlarınızı, aldığınız ödemeleri ve ödeme bekleyen alacakları dönem dönem izleyin."
        context={context}
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Satış ara"
            aria-label="Satış ara"
          />
        }
        secondary={filterPopover}
        primary={
          canPay ? <ToolbarAction prominent icon={Plus} label="Ödeme al" onClick={() => openPay()} disabled={noCustomers} /> : undefined
        }
      />

      {loadFailed ? (
        <ErrorState
          title="Satışlar yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : !mounted ? (
        <PageSkeleton kpis={4} rows={6} />
      ) : allEmpty ? (
        noCustomers ? (
          <EmptyState
            icon={Users}
            title="Önce bir müşteri ekleyin"
            description="Ödeme almak için en az bir müşteri gerekir."
            action={
              <Button asChild>
                <Link href="/musteriler?yeni=1">
                  <Plus />
                  Yeni müşteri
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Henüz satış veya ödeme yok"
            description="Ödeme alın, paket satın ya da fiyatlı bir randevuyu tamamlayın; satışlar burada listelenir."
            action={payAction}
          />
        )
      ) : (
        <>
          <MetricStrip aria-label="Dönem özeti">
            <Metric label="Satış" value={formatMoney(metrics.salesTotal)} {...delta(metrics.salesDelta)} />
            <Metric label="Tahsilat" value={formatMoney(metrics.collected)} {...delta(metrics.collectedDelta)} />
            <Metric label="Nakit tahsilat" value={formatMoney(metrics.cash)} context={metrics.otherText || undefined} />
            <Metric
              label="Açık alacak"
              value={formatMoney(debt.openDebt)}
              tone={debt.openDebt > 0 ? "danger" : "default"}
              flag={debt.overdueCount > 0 ? `${debt.overdueCount} gecikmiş` : undefined}
              context={debt.debtorCount > 0 ? `${debt.debtorCount} borçlu müşteri` : "Ödeme bekleyen yok"}
            />
          </MetricStrip>

          <SalesChart
            items={chartItems}
            start={range.start}
            end={range.end}
            kind={kind}
            today={today}
            seriesName={list === "satis" ? "Satış" : "Tahsilat"}
          />

          <div className="space-y-4">
            <FilterBar
              scope={{
                "aria-label": "Liste",
                value: list,
                onValueChange: (v) => set({ liste: v === "satis" ? null : v }),
                items: [
                  { value: "satis", label: "Satışlar", count: salesSearched.length },
                  { value: "tahsilat", label: "Tahsilatlar", count: paymentsSearched.length },
                ],
              }}
              tokens={tokens}
              onClearAll={hasFilters ? clearFilters : undefined}
              result={`${count} ${list === "satis" ? "satış" : "tahsilat"}`}
            />
            {list === "satis" ? (
              <DataTable
                key="satis"
                caption="Satışlar"
                columns={saleColumns}
                rows={salesRows}
                getRowId={(s) => s.id}
                defaultSort={{ key: "date", dir: "desc" }}
                renderMobileRow={renderSaleRow}
                empty={empty}
                footer={
                  <>
                    <span>{count} satış</span>
                    <Money amount={total} />
                  </>
                }
              />
            ) : (
              <DataTable
                key="tahsilat"
                caption="Tahsilatlar"
                columns={paymentColumns}
                rows={paymentRows}
                getRowId={(p) => p.id}
                defaultSort={{ key: "date", dir: "desc" }}
                renderMobileRow={renderPaymentRow}
                empty={empty}
                footer={
                  <>
                    <span>{count} tahsilat</span>
                    <Money amount={total} />
                  </>
                }
              />
            )}
          </div>
        </>
      )}

      <PaymentSheet
        open={payOpen}
        onOpenChange={(o) => !o && closePay()}
        customers={sheetCustomers}
        packages={packages}
        initial={payInit ?? undefined}
        description={payInit ? sheetCustomers.find((c) => c.id === payInit.customer_id)?.full_name : undefined}
      />
    </div>
  );
}
