"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { formatMoney, Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge, StatusIcons } from "@/components/shared/status";
import type { StatusVariant } from "@/lib/constants";

import { useRandevuParams } from "../randevular/use-randevu-params";
import { deleteProduct } from "./actions";
import { MovementForm } from "./movement-form";
import { ProductForm } from "./product-form";

export interface StockProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  stock_qty: number;
  critical_level: number;
  cost_price: number | null;
  sale_price: number | null;
  is_active: boolean;
}

export interface StockMovement {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  unit: string;
  kind: "in" | "out" | "adjust" | "consume";
  qty: number;
  note: string | null;
}

const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const QTY = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const qtyText = (n: number, unit: string) => `${QTY.format(n)} ${unit}`;
const tr = (s: string) => s.toLocaleLowerCase("tr-TR");

const MOVEMENT: Record<StockMovement["kind"], { label: string; icon: LucideIcon; sign: string }> = {
  in: { label: "Giriş", icon: ArrowDownToLine, sign: "+" },
  out: { label: "Çıkış", icon: ArrowUpFromLine, sign: "−" },
  adjust: { label: "Sayım", icon: Boxes, sign: "=" },
  consume: { label: "Seansta kullanıldı", icon: ArrowUpFromLine, sign: "−" },
};

type StockLevel = "tukendi" | "kritik" | "az" | "yeterli";

/** Stok durumu: kritik seviyeye göre. Renk yanında simge ve metin vardır. */
function levelOf(p: StockProduct): { key: StockLevel; label: string; variant: StatusVariant } {
  if (p.stock_qty <= 0) return { key: "tukendi", label: "Tükendi", variant: "danger" };
  if (p.critical_level > 0 && p.stock_qty <= p.critical_level) return { key: "kritik", label: "Kritik", variant: "danger" };
  if (p.critical_level > 0 && p.stock_qty <= p.critical_level * 2) return { key: "az", label: "Az", variant: "warning" };
  return { key: "yeterli", label: "Yeterli", variant: "positive" };
}

type Scope = "hepsi" | "dikkat" | "yeterli";

type Panel = { kind: "product"; product: StockProduct | null } | { kind: "movement"; product: StockProduct; move: "in" | "out" };

function LevelBadge({ p }: { p: StockProduct }) {
  const l = levelOf(p);
  return (
    <StatusBadge variant={l.variant} icon={l.key === "tukendi" ? StatusIcons.cancelled : undefined}>
      {l.label}
    </StatusBadge>
  );
}

function RowMenu({
  name,
  onIn,
  onOut,
  onEdit,
  onDelete,
}: {
  name: string;
  onIn: () => void;
  onOut: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" aria-label={`${name} işlemleri`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onIn}>
          <ArrowDownToLine />
          Stok girişi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOut}>
          <ArrowUpFromLine />
          Stok çıkışı
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Düzenle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StockView({
  products,
  movements,
  loadFailed,
}: {
  products: StockProduct[];
  movements: StockMovement[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const { params, set } = useRandevuParams();

  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [deleting, setDeleting] = useState<StockProduct | null>(null);
  const [busy, setBusy] = useState(false);

  const createOpen = params.get("yeni") === "1";
  const panelOpen = createOpen || panel !== null;
  const activePanel: Panel | null = panel ?? (createOpen ? { kind: "product", product: null } : null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category?.trim()).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, "tr")) as string[],
    [products]
  );
  const category = categories.includes(params.get("kategori") ?? "") ? (params.get("kategori") as string) : "all";
  const rawScope = params.get("durum");
  const scope: Scope = rawScope === "dikkat" || rawScope === "yeterli" ? rawScope : "hepsi";

  const metrics = useMemo(() => {
    let value = 0;
    let critical = 0;
    let low = 0;
    for (const p of products) {
      value += p.stock_qty * (p.cost_price ?? 0);
      const k = levelOf(p).key;
      if (k === "tukendi" || k === "kritik") critical++;
      else if (k === "az") low++;
    }
    return { value, critical, low };
  }, [products]);

  const needle = tr(q.trim());
  const searched = useMemo(
    () =>
      products.filter((p) => {
        if (category !== "all" && p.category !== category) return false;
        if (needle && !tr(`${p.name} ${p.sku ?? ""}`).includes(needle)) return false;
        return true;
      }),
    [products, needle, category]
  );
  const counts = useMemo(() => {
    const attention = searched.filter((p) => levelOf(p).key !== "yeterli").length;
    return { hepsi: searched.length, dikkat: attention, yeterli: searched.length - attention };
  }, [searched]);
  const rows = useMemo(
    () =>
      searched.filter((p) => {
        const ok = levelOf(p).key === "yeterli";
        return scope === "hepsi" ? true : scope === "yeterli" ? ok : !ok;
      }),
    [searched, scope]
  );

  const hasFilters = category !== "all" || q.trim() !== "";
  function clearFilters() {
    setQ("");
    set({ q: null, kategori: null });
  }
  function openCreate() {
    set({ yeni: "1" });
  }
  function closePanel() {
    setPanel(null);
    if (params.get("yeni")) set({ yeni: null });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteProduct(deleting.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Ürün silindi");
    setDeleting(null);
    router.refresh();
  }

  const menuOf = (p: StockProduct) => (
    <RowMenu
      name={p.name}
      onIn={() => setPanel({ kind: "movement", product: p, move: "in" })}
      onOut={() => setPanel({ kind: "movement", product: p, move: "out" })}
      onEdit={() => setPanel({ kind: "product", product: p })}
      onDelete={() => setDeleting(p)}
    />
  );

  const columns: DataTableColumn<StockProduct>[] = [
    {
      key: "name",
      header: "Ürün",
      sortValue: (p) => p.name,
      cell: (p) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium" title={p.name}>
            {p.name}
          </span>
          {p.sku && <span className="block truncate text-subhead text-label-2">{p.sku}</span>}
        </span>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      hideBelow: "@3xl",
      sortValue: (p) => p.category ?? "",
      cell: (p) => <span className="text-label-2">{p.category ?? "—"}</span>,
    },
    {
      key: "qty",
      header: "Stok",
      align: "right",
      sortValue: (p) => p.stock_qty,
      cell: (p) => <span className="whitespace-nowrap font-semibold tabular-nums">{qtyText(p.stock_qty, p.unit)}</span>,
    },
    {
      key: "level",
      header: "Durum",
      sortValue: (p) => levelOf(p).label,
      cell: (p) => <LevelBadge p={p} />,
    },
    {
      key: "value",
      header: "Değer",
      align: "right",
      hideBelow: "@4xl",
      sortValue: (p) => (p.cost_price ? p.stock_qty * p.cost_price : null),
      cell: (p) => (p.cost_price ? <Money amount={p.stock_qty * p.cost_price} tone="muted" /> : <span className="text-label-3">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (p) => (
        <span className="flex items-center justify-end gap-1">
          <Button
            variant="tinted"
            size="sm"
            onClick={() => setPanel({ kind: "movement", product: p, move: "in" })}
            aria-label={`${p.name} için stok girişi`}
          >
            <ArrowDownToLine />
            Stok girişi
          </Button>
          {menuOf(p)}
        </span>
      ),
    },
  ];

  function renderMobileRow(p: StockProduct) {
    return (
      <div className="flex min-h-[60px] items-center gap-1 pr-1 pl-4">
        <button
          type="button"
          onClick={() => setPanel({ kind: "product", product: p })}
          aria-label={`${p.name}, ${qtyText(p.stock_qty, p.unit)}. Ürünü düzenle`}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus-visible:outline-offset-[-3px]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{p.name}</span>
            <span className="block truncate text-subhead text-label-2 tabular-nums">{qtyText(p.stock_qty, p.unit)}</span>
          </span>
          <span className="shrink-0">
            <LevelBadge p={p} />
          </span>
        </button>
        {menuOf(p)}
      </div>
    );
  }

  const addAction = (
    <Button onClick={openCreate}>
      <Plus />
      Yeni ürün
    </Button>
  );

  const empty =
    searched.length === 0 ? (
      <EmptyState
        variant="inline"
        icon={Search}
        title="Sonuç yok"
        description="Aramaya ve filtrelere uyan ürün yok. Filtreleri temizleyip tekrar deneyin."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Filtreleri temizle
          </Button>
        }
      />
    ) : (
      <EmptyState
        variant="inline"
        icon={Boxes}
        title={scope === "dikkat" ? "Dikkat gerektiren ürün yok" : "Bu durumda ürün yok"}
        description="Listeyi değiştirip tüm ürünlere bakabilirsiniz."
        action={
          <Button variant="secondary" onClick={() => set({ durum: null })}>
            Tüm ürünler
          </Button>
        }
      />
    );

  const filterPopover =
    categories.length > 0 ? (
      <Popover>
        <PopoverTrigger asChild>
          <ToolbarAction icon={ListFilter} label="Filtrele" mobile="icon" badge={category !== "all" ? 1 : undefined} />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[19rem] space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-kategori">Kategori</Label>
            <Select value={category} onValueChange={(v) => set({ kategori: v === "all" ? null : v })}>
              <SelectTrigger id="f-kategori" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm kategoriler</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category !== "all" && (
            <Button variant="plain" size="sm" onClick={() => set({ kategori: null })}>
              Filtreleri temizle
            </Button>
          )}
        </PopoverContent>
      </Popover>
    ) : undefined;

  const tokens =
    category !== "all"
      ? [{ key: "kategori", label: category, title: `Kategori: ${category}`, onRemove: () => set({ kategori: null }) }]
      : [];

  const panelTitle =
    activePanel?.kind === "movement"
      ? activePanel.move === "in"
        ? "Stok girişi"
        : "Stok çıkışı"
      : activePanel?.product
        ? "Ürünü düzenle"
        : "Yeni ürün";
  const panelDescription =
    activePanel?.kind === "movement"
      ? `${activePanel.product.name} · eldeki ${qtyText(activePanel.product.stock_qty, activePanel.product.unit)}`
      : activePanel?.product
        ? "Bilgileri güncelleyin. Stok miktarı giriş ve çıkışlarla değişir."
        : "Ürün adı yeterli; diğer alanlar isteğe bağlıdır.";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Stok"
        description="Ürün ve malzemeleri takip edin; azalanları hemen görün."
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Ürün ara"
            aria-label="Ürün ara"
          />
        }
        secondary={filterPopover}
        primary={<ToolbarAction prominent icon={Plus} label="Yeni ürün" onClick={openCreate} />}
      />

      {loadFailed ? (
        <ErrorState
          title="Stok yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : !mounted ? (
        <PageSkeleton kpis={4} rows={6} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Henüz ürün yok"
          description="Kullandığınız malzemeleri ve sattığınız ürünleri ekleyin; stok otomatik takip edilsin."
          action={addAction}
        />
      ) : (
        <>
          <MetricStrip aria-label="Stok özeti">
            <Metric label="Ürün" value={String(products.length)} context={categories.length > 0 ? `${categories.length} kategori` : undefined} />
            <Metric label="Stok değeri" value={formatMoney(metrics.value)} context="Alış fiyatı × miktar" />
            <Metric
              label="Kritik stok"
              value={String(metrics.critical)}
              tone={metrics.critical > 0 ? "danger" : "default"}
              context={metrics.critical > 0 ? "Tükenen veya kritik seviyede" : "Sorun yok"}
            />
            <Metric label="Az kalan" value={String(metrics.low)} context={metrics.low > 0 ? "Yakında bitebilir" : "Azalan ürün yok"} />
          </MetricStrip>

          <div className="space-y-4">
            <FilterBar
              scope={{
                "aria-label": "Stok durumu",
                value: scope,
                onValueChange: (v) => set({ durum: v === "hepsi" ? null : v }),
                items: [
                  { value: "hepsi", label: "Tümü", count: counts.hepsi },
                  { value: "dikkat", label: "Dikkat gerekli", count: counts.dikkat },
                  { value: "yeterli", label: "Yeterli", count: counts.yeterli },
                ],
              }}
              tokens={tokens}
              onClearAll={hasFilters ? clearFilters : undefined}
              result={`${rows.length} ürün`}
            />
            <DataTable
              caption="Ürünler"
              columns={columns}
              rows={rows}
              getRowId={(p) => p.id}
              defaultSort={{ key: "name", dir: "asc" }}
              onRowActivate={(p) => setPanel({ kind: "product", product: p })}
              renderMobileRow={renderMobileRow}
              empty={empty}
              footer={<span>{rows.length} ürün</span>}
            />
          </div>

          {movements.length > 0 && (
            <ListGroup title="Son hareketler" detail={`Son ${movements.length} kayıt`} inset={52} aria-label="Son stok hareketleri">
              {movements.map((m) => {
                const meta = MOVEMENT[m.kind];
                const Icon = meta.icon;
                return (
                  <ListRow
                    key={m.id}
                    leading={<Icon aria-hidden className="size-5 text-label-2" />}
                    title={m.productName}
                    subtitle={[meta.label, formatDate(m.createdAt), m.note].filter(Boolean).join(" · ")}
                    trailing={
                      <span className="font-semibold tabular-nums">
                        {meta.sign}
                        {qtyText(m.qty, m.unit)}
                      </span>
                    }
                  />
                );
              })}
            </ListGroup>
          )}
        </>
      )}

      <FormSheet open={panelOpen} onOpenChange={(o) => !o && closePanel()} title={panelTitle} description={panelDescription}>
        {activePanel?.kind === "movement" ? (
          <MovementForm
            key={`${activePanel.product.id}-${activePanel.move}`}
            productId={activePanel.product.id}
            kind={activePanel.move}
            unit={activePanel.product.unit}
            onSuccess={() => {
              closePanel();
              router.refresh();
            }}
            onCancel={closePanel}
          />
        ) : activePanel ? (
          <ProductForm
            key={activePanel.product?.id ?? "yeni"}
            product={activePanel.product ?? undefined}
            categories={categories}
            onSuccess={() => {
              closePanel();
              router.refresh();
            }}
            onCancel={closePanel}
          />
        ) : null}
      </FormSheet>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürünü sil</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” ve tüm stok hareketleri kalıcı olarak silinecek. Bu işlem geri alınamaz.
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
