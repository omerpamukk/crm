"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Search, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import type { Staff } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormSheet } from "@/components/shared/form-sheet";
import { Metric, MetricStrip } from "@/components/shared/metric";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status";

import { useRandevuParams } from "../randevular/use-randevu-params";
import { deleteStaff } from "./actions";
import { StaffForm } from "./staff-form";

const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type Scope = "aktif" | "pasif" | "hepsi";
const tr = (s: string) => s.toLocaleLowerCase("tr-TR");
const rateText = (s: Staff) => (s.commission_rate > 0 ? `%${s.commission_rate}` : "—");

function RowMenu({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" aria-label={`${name} işlemleri`}>
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

function StatusCell({ s }: { s: Staff }) {
  return s.is_active ? (
    <StatusBadge variant="positive">Aktif</StatusBadge>
  ) : (
    <StatusBadge variant="secondary">Pasif</StatusBadge>
  );
}

export function StaffView({
  staff,
  canManage,
  loadFailed,
}: {
  staff: Staff[];
  canManage: boolean;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const { params, set } = useRandevuParams();

  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [editing, setEditing] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  const createOpen = canManage && params.get("yeni") === "1";
  const formOpen = createOpen || editing !== null;

  const raw = params.get("durum");
  const scope: Scope = raw === "pasif" || raw === "hepsi" ? raw : "aktif";

  const metrics = useMemo(() => {
    const active = staff.filter((s) => s.is_active);
    const rated = active.filter((s) => s.commission_rate > 0);
    return {
      active: active.length,
      passive: staff.length - active.length,
      avgRate: rated.length ? rated.reduce((t, s) => t + s.commission_rate, 0) / rated.length : null,
    };
  }, [staff]);

  const needle = tr(q.trim());
  const searched = useMemo(
    () =>
      staff.filter((s) => !needle || tr(`${s.full_name} ${s.title ?? ""} ${s.phone ?? ""} ${s.email ?? ""}`).includes(needle)),
    [staff, needle]
  );
  const counts = useMemo(() => {
    const active = searched.filter((s) => s.is_active).length;
    return { aktif: active, pasif: searched.length - active, hepsi: searched.length };
  }, [searched]);
  const rows = useMemo(
    () => searched.filter((s) => (scope === "hepsi" ? true : scope === "aktif" ? s.is_active : !s.is_active)),
    [searched, scope]
  );

  function clearSearch() {
    setQ("");
    set({ q: null });
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
    const res = await deleteStaff(deleting.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Personel silindi");
    setDeleting(null);
    router.refresh();
  }

  const columns: DataTableColumn<Staff>[] = [
    {
      key: "name",
      header: "Personel",
      sortValue: (s) => s.full_name,
      cell: (s) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={s.full_name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium" title={s.full_name}>
              {s.full_name}
            </span>
            {s.title && <span className="block truncate text-subhead text-label-2">{s.title}</span>}
          </span>
        </span>
      ),
    },
    {
      key: "contact",
      header: "İletişim",
      hideBelow: "@3xl",
      cell: (s) =>
        s.phone || s.email ? (
          <span className="block min-w-0 text-subhead text-label-2">
            {s.phone && <span className="block truncate tabular-nums">{s.phone}</span>}
            {s.email && <span className="block truncate">{s.email}</span>}
          </span>
        ) : (
          <span className="text-label-3">—</span>
        ),
    },
    {
      key: "rate",
      header: "Komisyon",
      align: "right",
      hideBelow: "@2xl",
      sortValue: (s) => s.commission_rate,
      cell: (s) => <span className="tabular-nums">{rateText(s)}</span>,
    },
    {
      key: "status",
      header: "Durum",
      sortValue: (s) => (s.is_active ? 0 : 1),
      cell: (s) => <StatusCell s={s} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (s) =>
        canManage ? <RowMenu name={s.full_name} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} /> : null,
    },
  ];

  function renderMobileRow(s: Staff) {
    const sub = [s.title, s.commission_rate > 0 ? `Komisyon ${rateText(s)}` : null].filter(Boolean).join(" · ");
    return (
      <div className="flex min-h-[60px] items-center gap-1 pr-1 pl-4">
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setEditing(s)}
          aria-label={`${s.full_name}. Personeli düzenle`}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus-visible:outline-offset-[-3px]"
        >
          <Avatar name={s.full_name} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{s.full_name}</span>
            {sub && <span className="block truncate text-subhead text-label-2">{sub}</span>}
          </span>
          <span className="shrink-0">
            <StatusCell s={s} />
          </span>
        </button>
        {canManage && <RowMenu name={s.full_name} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />}
      </div>
    );
  }

  const addAction = canManage ? (
    <Button onClick={openCreate}>
      <Plus />
      Yeni personel
    </Button>
  ) : undefined;

  const empty =
    q.trim() !== "" && searched.length === 0 ? (
      <EmptyState
        variant="inline"
        icon={Search}
        title="Sonuç yok"
        description="Aramaya uyan personel yok. Aramayı temizleyip tekrar deneyin."
        action={
          <Button variant="secondary" onClick={clearSearch}>
            Aramayı temizle
          </Button>
        }
      />
    ) : (
      <EmptyState
        variant="inline"
        icon={UserCog}
        title={scope === "pasif" ? "Pasif personel yok" : "Aktif personel yok"}
        description="Listeyi değiştirip tüm personele bakabilirsiniz."
        action={
          <Button variant="secondary" onClick={() => set({ durum: "hepsi" })}>
            Tüm personel
          </Button>
        }
      />
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Personel"
        description="Personelinizi, ünvanlarını ve komisyon oranlarını yönetin."
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Personel ara"
            aria-label="Personel ara"
          />
        }
        primary={canManage ? <ToolbarAction prominent icon={Plus} label="Yeni personel" onClick={openCreate} /> : undefined}
      />

      {loadFailed ? (
        <ErrorState
          title="Personel yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : !mounted ? (
        <PageSkeleton kpis={3} rows={6} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Henüz personel yok"
          description="Hizmeti veren kişileri ekleyin; randevu oluştururken personel atayabilir, performanslarını raporlardan izleyebilirsiniz."
          action={addAction}
        />
      ) : (
        <>
          <MetricStrip aria-label="Personel özeti">
            <Metric label="Aktif personel" value={String(metrics.active)} />
            <Metric label="Pasif personel" value={String(metrics.passive)} />
            <Metric
              label="Ortalama komisyon"
              value={metrics.avgRate != null ? `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(metrics.avgRate)}` : "—"}
              context={metrics.avgRate != null ? "Aktif personel" : "Oran girilmemiş"}
            />
          </MetricStrip>

          <div className="space-y-4">
            <FilterBar
              scope={{
                "aria-label": "Personel durumu",
                value: scope,
                onValueChange: (v) => set({ durum: v === "aktif" ? null : v }),
                items: [
                  { value: "aktif", label: "Aktif", count: counts.aktif },
                  { value: "pasif", label: "Pasif", count: counts.pasif },
                  { value: "hepsi", label: "Tümü", count: counts.hepsi },
                ],
              }}
              result={`${rows.length} personel`}
            />
            <DataTable
              caption="Personel"
              columns={columns}
              rows={rows}
              getRowId={(s) => s.id}
              defaultSort={{ key: "name", dir: "asc" }}
              onRowActivate={canManage ? (s) => setEditing(s) : undefined}
              renderMobileRow={renderMobileRow}
              mobileInset={64}
              empty={empty}
              footer={<span>{rows.length} personel</span>}
            />
          </div>
        </>
      )}

      <FormSheet
        open={formOpen}
        onOpenChange={(o) => !o && closeForm()}
        title={editing ? "Personeli düzenle" : "Yeni personel"}
        description={editing ? editing.full_name : "Ad ve ünvan yeterli; diğer alanlar isteğe bağlıdır."}
      >
        <StaffForm
          key={editing?.id ?? "yeni"}
          staff={editing ?? undefined}
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
            <DialogTitle>Personeli sil</DialogTitle>
            <DialogDescription>
              “{deleting?.full_name}” kalıcı olarak silinecek. Bu işlem geri alınamaz. Geçmiş kaydı korunsun istiyorsanız silmek yerine pasife alın.
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
