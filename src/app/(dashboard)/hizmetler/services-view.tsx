"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ListFilter, MoreHorizontal, Pencil, Plus, Scissors, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/format";
import type { Service } from "@/types/database";
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
import { Metric, MetricStrip } from "@/components/shared/metric";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";

import { useRandevuParams } from "../randevular/use-randevu-params";
import { deleteService } from "./actions";
import { ServiceForm } from "./service-form";

const noopSubscribe = () => () => {};
/** Sunucuda false, istemcide true: adres çubuğundaki duruma bağlı içerik uyuşmazlık yaratmasın. */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const tr = (s: string) => s.toLocaleLowerCase("tr-TR");

function RowMenu({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" aria-label={`${name} hizmeti işlemleri`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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

export function ServicesView({
  services,
  canManage,
  loadFailed,
}: {
  services: Service[];
  canManage: boolean;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const { params, set } = useRandevuParams();

  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  const createOpen = canManage && params.get("yeni") === "1";
  const formOpen = createOpen || editing !== null;

  const categories = useMemo(
    () => [...new Set(services.map((s) => s.category?.trim()).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, "tr")) as string[],
    [services]
  );
  const category = categories.includes(params.get("kategori") ?? "") ? (params.get("kategori") as string) : "all";

  const metrics = useMemo(() => {
    const priced = services.filter((s) => s.price != null);
    const timed = services.filter((s) => s.duration_min != null);
    return {
      count: services.length,
      avgPrice: priced.length ? priced.reduce((t, s) => t + (s.price ?? 0), 0) / priced.length : null,
      avgDuration: timed.length ? Math.round(timed.reduce((t, s) => t + (s.duration_min ?? 0), 0) / timed.length) : null,
    };
  }, [services]);

  const needle = tr(q.trim());
  const rows = useMemo(
    () =>
      services.filter((s) => {
        if (category !== "all" && s.category !== category) return false;
        if (needle && !tr(`${s.name} ${s.category ?? ""}`).includes(needle)) return false;
        return true;
      }),
    [services, needle, category]
  );

  const hasFilters = category !== "all" || q.trim() !== "";
  function clearFilters() {
    setQ("");
    set({ q: null, kategori: null });
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
    const res = await deleteService(deleting.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Hizmet silindi");
    setDeleting(null);
    router.refresh();
  }

  const columns: DataTableColumn<Service>[] = [
    {
      key: "name",
      header: "Hizmet",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="block min-w-0 truncate font-medium" title={s.name}>
          {s.name}
        </span>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      hideBelow: "@3xl",
      sortValue: (s) => s.category ?? "",
      cell: (s) => <span className="text-label-2">{s.category ?? "—"}</span>,
    },
    {
      key: "duration",
      header: "Süre",
      align: "right",
      sortValue: (s) => s.duration_min,
      cell: (s) =>
        s.duration_min ? <span className="whitespace-nowrap tabular-nums">{s.duration_min} dk</span> : <span className="text-label-3">—</span>,
    },
    {
      key: "price",
      header: "Fiyat",
      align: "right",
      sortValue: (s) => s.price,
      cell: (s) => (s.price != null ? <Money amount={s.price} /> : <span className="text-label-3">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (s) =>
        canManage ? <RowMenu name={s.name} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} /> : null,
    },
  ];

  function renderMobileRow(s: Service) {
    const sub = [s.category, s.duration_min ? `${s.duration_min} dk` : null].filter(Boolean).join(" · ");
    return (
      <div className="flex min-h-[60px] items-center gap-1 pr-1 pl-4">
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setEditing(s)}
          aria-label={`${s.name}. Hizmeti düzenle`}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus-visible:outline-offset-[-3px]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{s.name}</span>
            {sub && <span className="block truncate text-subhead text-label-2">{sub}</span>}
          </span>
          <span className="shrink-0 text-[0.9375rem] tabular-nums">{s.price != null ? formatPrice(s.price) : "—"}</span>
        </button>
        {canManage && <RowMenu name={s.name} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />}
      </div>
    );
  }

  const addAction = canManage ? (
    <Button onClick={openCreate}>
      <Plus />
      Yeni hizmet
    </Button>
  ) : undefined;

  const empty = (
    <EmptyState
      variant="inline"
      icon={Search}
      title="Sonuç yok"
      description="Aramaya ve filtrelere uyan hizmet yok. Filtreleri temizleyip tekrar deneyin."
      action={
        <Button variant="secondary" onClick={clearFilters}>
          Filtreleri temizle
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hizmetler"
        description="Sunduğunuz hizmetleri, sürelerini ve fiyatlarını yönetin."
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Hizmet ara"
            aria-label="Hizmet ara"
          />
        }
        secondary={filterPopover}
        primary={canManage ? <ToolbarAction prominent icon={Plus} label="Yeni hizmet" onClick={openCreate} /> : undefined}
      />

      {loadFailed ? (
        <ErrorState
          title="Hizmetler yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : !mounted ? (
        <PageSkeleton kpis={3} rows={6} />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Henüz hizmet yok"
          description="Sunduğunuz hizmetleri ekleyin; randevu oluştururken bu listeden seçersiniz."
          action={addAction}
        />
      ) : (
        <>
          <MetricStrip aria-label="Hizmet özeti">
            <Metric label="Hizmet" value={String(metrics.count)} context={categories.length > 0 ? `${categories.length} kategori` : undefined} />
            <Metric label="Ortalama fiyat" value={metrics.avgPrice != null ? formatPrice(Math.round(metrics.avgPrice)) : "—"} />
            <Metric label="Ortalama süre" value={metrics.avgDuration != null ? `${metrics.avgDuration} dk` : "—"} />
          </MetricStrip>

          <div className="space-y-4">
            <FilterBar
              tokens={tokens}
              onClearAll={hasFilters ? clearFilters : undefined}
              result={`${rows.length} hizmet`}
            />
            <DataTable
              caption="Hizmetler"
              columns={columns}
              rows={rows}
              getRowId={(s) => s.id}
              defaultSort={{ key: "name", dir: "asc" }}
              onRowActivate={canManage ? (s) => setEditing(s) : undefined}
              renderMobileRow={renderMobileRow}
              empty={empty}
              footer={<span>{rows.length} hizmet</span>}
            />
          </div>
        </>
      )}

      <FormSheet
        open={formOpen}
        onOpenChange={(o) => !o && closeForm()}
        title={editing ? "Hizmeti düzenle" : "Yeni hizmet"}
        description={editing ? editing.name : "Hizmetin adını, süresini ve fiyatını girin."}
      >
        <ServiceForm
          key={editing?.id ?? "yeni"}
          service={editing ?? undefined}
          categories={categories}
          onSuccess={() => {
            closeForm();
            router.refresh();
          }}
          onCancel={closeForm}
        />
      </FormSheet>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hizmeti sil</DialogTitle>
            <DialogDescription>“{deleting?.name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.</DialogDescription>
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
