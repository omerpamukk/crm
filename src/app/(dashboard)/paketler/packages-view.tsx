"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, ListFilter, Package as PackageIcon, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { derivePaymentStatus, paymentStatusLabel, paymentStatusVariant } from "@/lib/constants";
import type { DebtSummary } from "@/lib/balances";
import { formatDate } from "@/lib/format";
import type { Package } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { formatMoney, Money } from "@/components/shared/money";
import { PackageProgress } from "@/components/shared/package-progress";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status";
import { SwipeRow } from "@/components/shared/swipe-row";

import { useRandevuParams } from "../randevular/use-randevu-params";
import { PaymentSheet } from "../tahsilat/payment-sheet";
import { deletePackage } from "./actions";
import { PackageForm } from "./package-form";
import { PackageRowActions, type PackageHandlers } from "./package-row-actions";

export type PackageRow = Package & { customer: { full_name: string } | null };

const DAY = 86_400_000;
const noopSubscribe = () => () => {};
/** Sunucuda false, istemcide true: tarihe bağlı içerik hydration uyuşmazlığı yaratmasın. */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type Scope = "aktif" | "bitti";
const ODEME = [
  { value: "odendi", label: "Ödendi" },
  { value: "kismi", label: "Kısmi" },
  { value: "odenmedi", label: "Ödenmedi" },
] as const;

type Derived = {
  row: PackageRow;
  name: string;
  total: number | null;
  remaining: number | null;
  done: boolean;
  low: boolean;
  debt: number;
  overdue: boolean;
  status: "odendi" | "kismi" | "odenmedi";
};

function derive(p: PackageRow, nowMs: number): Derived {
  const total = p.total_sessions;
  const remaining = p.remaining_sessions ?? (total != null ? total : null);
  const done = total != null && total > 0 && remaining != null && remaining <= 0;
  const low = !done && total != null && total > 1 && remaining != null && remaining <= 2;
  const debt = p.price != null ? Math.max(p.price - (p.paid_amount ?? 0), 0) : 0;
  const overdue = debt > 0 && !!p.purchased_at && nowMs - new Date(p.purchased_at).getTime() > 30 * DAY;
  return {
    row: p,
    name: p.service_name ?? "Paket",
    total,
    remaining,
    done,
    low,
    debt,
    overdue,
    status: derivePaymentStatus(p.price, p.paid_amount),
  };
}

function CustomerCell({ d }: { d: Derived }) {
  const name = d.row.customer?.full_name ?? "Müşteri";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size="sm" />
      {d.row.customer_id ? (
        <Link href={`/musteriler/${d.row.customer_id}`} className="min-w-0 truncate font-medium hover:text-primary-text hover:underline" title={name}>
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

function Progress({ d, className }: { d: Derived; className?: string }) {
  if (d.total == null || d.remaining == null) {
    return <span className="block truncate text-[0.875rem]">{d.name}</span>;
  }
  return <PackageProgress label={d.name} used={Math.max(d.total - d.remaining, 0)} total={d.total} className={className} />;
}

export function PackagesView({
  packages,
  customers,
  canManage,
  loadFailed,
  debt,
}: {
  packages: PackageRow[];
  customers: { id: string; full_name: string }[];
  canManage: boolean;
  loadFailed: boolean;
  /** Açık alacak: müşteri bakiyesinin tek kaynağından (src/lib/balances.ts). */
  debt: DebtSummary;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const { params, set } = useRandevuParams();

  const [nowMs] = useState(() => Date.now());
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [deleting, setDeleting] = useState<PackageRow | null>(null);
  const [paying, setPaying] = useState<PackageRow | null>(null);
  const [busy, setBusy] = useState(false);

  const createOpen = canManage && params.get("yeni") === "1";
  const formOpen = createOpen || editing !== null;

  const scope: Scope = params.get("durum") === "bitti" ? "bitti" : "aktif";
  const odeme = ODEME.some((o) => o.value === params.get("odeme")) ? (params.get("odeme") as string) : "all";

  const all = useMemo(() => packages.map((p) => derive(p, nowMs)), [packages, nowMs]);

  const metrics = useMemo(() => {
    const active = all.filter((d) => !d.done);
    return {
      active: active.length,
      low: active.filter((d) => d.low).length,
      done: all.length - active.length,
      debt: debt.openDebt,
      debtCount: debt.debtorCount,
      overdueCount: debt.overdueCount,
    };
  }, [all, debt]);

  const needle = q.trim().toLocaleLowerCase("tr-TR");
  const searched = useMemo(
    () =>
      all.filter((d) => {
        if (odeme !== "all" && d.status !== odeme) return false;
        if (needle && !`${d.row.customer?.full_name ?? ""} ${d.name}`.toLocaleLowerCase("tr-TR").includes(needle)) return false;
        return true;
      }),
    [all, needle, odeme]
  );
  const counts = useMemo(() => {
    const done = searched.filter((d) => d.done).length;
    return { aktif: searched.length - done, bitti: done };
  }, [searched]);
  const rows = useMemo(() => searched.filter((d) => (scope === "bitti" ? d.done : !d.done)), [searched, scope]);

  const filterCount = odeme !== "all" ? 1 : 0;
  const hasFilters = filterCount > 0 || q.trim() !== "";
  function clearFilters() {
    setQ("");
    set({ q: null, odeme: null });
  }

  function openCreate() {
    set({ yeni: "1" });
  }
  function closeForm() {
    setEditing(null);
    if (params.get("yeni")) set({ yeni: null });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deletePackage(deleting.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Paket silindi");
    setDeleting(null);
    router.refresh();
  }

  function handlersOf(p: PackageRow): PackageHandlers {
    return { onPay: () => setPaying(p), onEdit: () => setEditing(p), onDelete: () => setDeleting(p) };
  }

  const columns: DataTableColumn<Derived>[] = [
    {
      key: "customer",
      header: "Müşteri",
      sortValue: (d) => d.row.customer?.full_name ?? "",
      cell: (d) => <CustomerCell d={d} />,
    },
    {
      key: "package",
      header: "Paket",
      sortValue: (d) => (d.total != null && d.remaining != null ? d.remaining : null),
      className: "min-w-[9rem]",
      cell: (d) => <Progress d={d} />,
    },
    {
      key: "status",
      header: "Ödeme",
      sortValue: (d) => paymentStatusLabel(d.status),
      cell: (d) => <StatusBadge variant={paymentStatusVariant(d.status)}>{paymentStatusLabel(d.status)}</StatusBadge>,
    },
    {
      key: "price",
      header: "Fiyat",
      align: "right",
      hideBelow: "@3xl",
      sortValue: (d) => d.row.price,
      cell: (d) => (d.row.price != null ? <Money amount={d.row.price} /> : <span className="text-label-3">—</span>),
    },
    {
      key: "debt",
      header: "Kalan tutar",
      align: "right",
      sortValue: (d) => d.debt,
      cell: (d) => (d.debt > 0 ? <Money amount={d.debt} tone="debt" overdue={d.overdue} /> : <span className="text-label-3">—</span>),
    },
    {
      key: "date",
      header: "Satış tarihi",
      hideBelow: "@4xl",
      sortValue: (d) => (d.row.purchased_at ? new Date(d.row.purchased_at).getTime() : null),
      cell: (d) => <span className="whitespace-nowrap tabular-nums text-label-2">{formatDate(d.row.purchased_at)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (d) =>
        canManage ? (
          <span className="flex items-center justify-end gap-1">
            {d.debt > 0 && (
              <Button variant="tinted" size="sm" onClick={() => setPaying(d.row)} aria-label={`${d.row.customer?.full_name ?? "Müşteri"} için ödeme al`}>
                <Banknote />
                Ödeme al
              </Button>
            )}
            <PackageRowActions customerName={d.row.customer?.full_name ?? "Müşteri"} hasDebt={d.debt > 0} handlers={handlersOf(d.row)} />
          </span>
        ) : null,
    },
  ];

  function renderMobileRow(d: Derived) {
    const name = d.row.customer?.full_name ?? "Müşteri";
    return (
      <SwipeRow
        trailing={
          canManage && d.debt > 0
            ? [{ label: "Ödeme al", icon: Banknote, tone: "primary", onAction: () => setPaying(d.row) }]
            : []
        }
      >
        <div className="flex min-h-[60px] items-center gap-1 pr-1 pl-4">
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setEditing(d.row)}
            aria-label={`${name}, ${d.name}. Paketi düzenle`}
            className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus-visible:outline-offset-[-3px]"
          >
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{name}</span>
              <Progress d={d} className="max-w-none" />
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              {d.debt > 0 ? (
                <Money amount={d.debt} tone="debt" overdue={d.overdue} className="text-[0.9375rem]" />
              ) : (
                <StatusBadge variant={paymentStatusVariant(d.status)}>{paymentStatusLabel(d.status)}</StatusBadge>
              )}
              {d.debt > 0 && <span className="text-subhead whitespace-nowrap text-label-2">{paymentStatusLabel(d.status)}</span>}
            </span>
          </button>
          {canManage && <PackageRowActions customerName={name} hasDebt={d.debt > 0} handlers={handlersOf(d.row)} />}
        </div>
      </SwipeRow>
    );
  }

  // ---- Boş durumlar ----
  const noCustomers = customers.length === 0;
  const sellAction = canManage && !noCustomers ? (
    <Button onClick={openCreate}>
      <Plus />
      Paket sat
    </Button>
  ) : undefined;

  const empty =
    packages.length > 0 && searched.length === 0 ? (
      <EmptyState
        variant="inline"
        icon={Search}
        title="Sonuç yok"
        description="Aramaya ve filtrelere uyan paket yok. Filtreleri temizleyip tekrar deneyin."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Filtreleri temizle
          </Button>
        }
      />
    ) : scope === "bitti" ? (
      <EmptyState
        variant="inline"
        icon={PackageIcon}
        title="Biten paket yok"
        description="Seansları tükenen paketler burada listelenir."
        action={
          <Button variant="secondary" onClick={() => set({ durum: null })}>
            Aktif paketlere dön
          </Button>
        }
      />
    ) : (
      <EmptyState
        variant="inline"
        icon={PackageIcon}
        title="Aktif paket yok"
        description="Seansı süren paket görünmüyor. Yeni bir paket satabilir ya da biten paketlere bakabilirsiniz."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {counts.bitti > 0 && (
              <Button variant="secondary" onClick={() => set({ durum: "bitti" })}>
                Biten paketlere bak
              </Button>
            )}
            {sellAction}
          </div>
        }
      />
    );

  const filterPopover = (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarAction icon={ListFilter} label="Filtrele" mobile="icon" badge={filterCount || undefined} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[19rem] space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="f-odeme">Ödeme durumu</Label>
          <Select value={odeme} onValueChange={(v) => set({ odeme: v === "all" ? null : v })}>
            <SelectTrigger id="f-odeme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              {ODEME.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filterCount > 0 && (
          <Button variant="plain" size="sm" onClick={() => set({ odeme: null })}>
            Filtreleri temizle
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );

  const tokens =
    odeme !== "all"
      ? [{ key: "odeme", label: paymentStatusLabel(odeme), title: `Ödeme durumu: ${paymentStatusLabel(odeme)}`, onRemove: () => set({ odeme: null }) }]
      : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Paketler"
        description="Satılan paketleri, kalan seansları ve ödeme bekleyen tutarları takip edin."
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Paket ara"
            aria-label="Paket ara"
          />
        }
        secondary={filterPopover}
        primary={canManage ? <ToolbarAction prominent icon={Plus} label="Paket sat" onClick={openCreate} disabled={noCustomers} /> : undefined}
      />

      {loadFailed ? (
        <ErrorState
          title="Paketler yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : !mounted ? (
        <PageSkeleton kpis={4} rows={6} />
      ) : packages.length === 0 ? (
        noCustomers ? (
          <EmptyState
            icon={Users}
            title="Önce bir müşteri ekleyin"
            description="Paket satmak için en az bir müşteri gerekir."
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
            icon={PackageIcon}
            title="Henüz paket satılmadı"
            description="Müşteriye seans paketi satın; kalan seansları ve ödemesini buradan takip edin."
            action={sellAction}
          />
        )
      ) : (
        <>
          <MetricStrip aria-label="Paket özeti">
            <Metric label="Aktif paket" value={String(metrics.active)} />
            <Metric label="Seansı azalan" value={String(metrics.low)} context={metrics.low > 0 ? "2 veya daha az seans kaldı" : "Azalan paket yok"} />
            <Metric label="Biten paket" value={String(metrics.done)} />
            <Metric
              label="Açık alacak"
              value={formatMoney(metrics.debt)}
              tone={metrics.debt > 0 ? "danger" : "default"}
              flag={metrics.overdueCount > 0 ? `${metrics.overdueCount} gecikmiş` : undefined}
              context={metrics.debtCount > 0 ? `${metrics.debtCount} borçlu müşteri` : "Ödeme bekleyen yok"}
            />
          </MetricStrip>

          <div className="space-y-4">
            <FilterBar
              scope={{
                "aria-label": "Paket durumu",
                value: scope,
                onValueChange: (v) => set({ durum: v === "aktif" ? null : v }),
                items: [
                  { value: "aktif", label: "Aktif", count: counts.aktif },
                  { value: "bitti", label: "Bitti", count: counts.bitti },
                ],
              }}
              tokens={tokens}
              onClearAll={hasFilters ? clearFilters : undefined}
              result={`${rows.length} paket`}
            />
            <DataTable
              caption="Paketler"
              columns={columns}
              rows={rows}
              getRowId={(d) => d.row.id}
              defaultSort={{ key: "customer", dir: "asc" }}
              onRowActivate={canManage ? (d) => setEditing(d.row) : undefined}
              renderMobileRow={renderMobileRow}
              empty={empty}
              footer={<span>{rows.length} paket</span>}
            />
          </div>
        </>
      )}

      {/* Paket sat / Düzenle */}
      <Sheet open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <SheetContent side="auto" className="sm:max-w-[28rem]">
          <SheetHeader>
            <SheetTitle>{editing ? "Paketi düzenle" : "Paket sat"}</SheetTitle>
            <SheetDescription>
              {editing ? (editing.customer?.full_name ?? "Müşteri") : "Müşteriyi, paketi ve ödemeyi girin."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <PackageForm
              pkg={editing ?? undefined}
              customers={customers}
              onSuccess={() => {
                closeForm();
                router.refresh();
              }}
              onCancel={closeForm}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Ödeme al (pakete bağlı) */}
      {paying && paying.customer_id && (
        <PaymentSheet
          open
          onOpenChange={(o) => !o && setPaying(null)}
          customers={[{ id: paying.customer_id, full_name: paying.customer?.full_name ?? "Müşteri" }]}
          packages={[{ id: paying.id, customer_id: paying.customer_id, service_name: paying.service_name }]}
          initial={{
            customer_id: paying.customer_id,
            package_id: paying.id,
            amount: String(Math.round(Math.max((paying.price ?? 0) - (paying.paid_amount ?? 0), 0) * 100) / 100),
          }}
          description={`${paying.customer?.full_name ?? "Müşteri"} · ${paying.service_name ?? "Paket"}`}
        />
      )}

      {/* Silme onayı */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paketi sil</DialogTitle>
            <DialogDescription>
              {deleting?.customer?.full_name ?? "Müşteri"} müşterisinin “{deleting?.service_name ?? "Paket"}” paketi kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" onClick={confirmDelete} disabled={busy}>
              {busy ? "Siliniyor" : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
