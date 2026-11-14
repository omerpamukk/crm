"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListFilter, MoreHorizontal, Pencil, Plus, ReceiptTurkishLira, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EXPENSE_CATEGORIES, expenseCategoryLabel, paymentMethodLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Expense } from "@/types/database";
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
import { formatMoney, Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";

import { useRandevuParams } from "../randevular/use-randevu-params";
import { PeriodControl } from "../raporlar/period-control";
import { deleteExpense } from "./actions";
import { ExpenseForm } from "./expense-form";

const KINDS = ["hafta", "ay", "ozel"] as const;
const tr = (s: string) => s.toLocaleLowerCase("tr-TR");

function RowMenu({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" aria-label={`${name} gideri işlemleri`}>
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

export function ExpensesView({
  todayMs,
  expenses,
  income,
  totalCount,
  loadFailed,
}: {
  todayMs: number;
  /** Seçili dönemdeki giderler (İstanbul günü, tarih sütunu). */
  expenses: Expense[];
  /** Aynı dönemdeki tahsilat toplamı. */
  income: number;
  /** Tüm zamanların gider sayısı (hiç gider yok durumunu ayırt etmek için). */
  totalCount: number;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const { params, set } = useRandevuParams();

  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);

  const createOpen = params.get("yeni") === "1";
  const formOpen = createOpen || editing !== null;

  const catParam = params.get("kategori") ?? "";
  const category = EXPENSE_CATEGORIES.some((c) => c.value === catParam) ? catParam : "all";

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const net = income - total;
  const margin = income > 0 ? Math.round((net / income) * 100) : null;

  const needle = tr(q.trim());
  const rows = useMemo(
    () =>
      expenses.filter((e) => {
        if (category !== "all" && e.category !== category) return false;
        if (needle && !tr(`${e.title} ${expenseCategoryLabel(e.category)} ${e.note ?? ""}`).includes(needle)) return false;
        return true;
      }),
    [expenses, needle, category]
  );
  const rowsTotal = useMemo(() => rows.reduce((s, e) => s + e.amount, 0), [rows]);

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
    const res = await deleteExpense(deleting.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Gider silindi");
    setDeleting(null);
    router.refresh();
  }

  const columns: DataTableColumn<Expense>[] = [
    {
      key: "date",
      header: "Tarih",
      sortValue: (e) => e.spent_at,
      cell: (e) => <span className="whitespace-nowrap tabular-nums text-label-2">{formatDate(e.spent_at)}</span>,
    },
    {
      key: "title",
      header: "Açıklama",
      sortValue: (e) => e.title,
      cell: (e) => (
        <span className="block min-w-0 truncate font-medium" title={e.title}>
          {e.title}
        </span>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      hideBelow: "@3xl",
      sortValue: (e) => expenseCategoryLabel(e.category),
      cell: (e) => <span className="text-label-2">{expenseCategoryLabel(e.category)}</span>,
    },
    {
      key: "method",
      header: "Ödeme şekli",
      hideBelow: "@4xl",
      cell: (e) => <span className="text-label-2">{paymentMethodLabel(e.method)}</span>,
    },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      sortValue: (e) => e.amount,
      cell: (e) => <Money amount={e.amount} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (e) => <RowMenu name={e.title} onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} />,
    },
  ];

  function renderMobileRow(e: Expense) {
    return (
      <div className="flex min-h-[60px] items-center gap-1 pr-1 pl-4">
        <button
          type="button"
          onClick={() => setEditing(e)}
          aria-label={`${e.title}. Gideri düzenle`}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus-visible:outline-offset-[-3px]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1rem] leading-[1.3125rem] font-semibold">{e.title}</span>
            <span className="block truncate text-subhead text-label-2">
              {expenseCategoryLabel(e.category)} · {formatDate(e.spent_at)}
            </span>
          </span>
          <Money amount={e.amount} className="shrink-0 text-[0.9375rem]" />
        </button>
        <RowMenu name={e.title} onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} />
      </div>
    );
  }

  const empty =
    expenses.length > 0 ? (
      <EmptyState
        variant="inline"
        icon={Search}
        title="Sonuç yok"
        description="Aramaya ve filtrelere uyan gider yok. Filtreleri temizleyip tekrar deneyin."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Filtreleri temizle
          </Button>
        }
      />
    ) : (
      <EmptyState
        variant="inline"
        icon={ReceiptTurkishLira}
        title="Bu dönemde gider yok"
        description="Başka bir dönem seçebilir ya da bu döneme yeni bir gider ekleyebilirsiniz."
        action={
          <Button onClick={openCreate}>
            <Plus />
            Yeni gider
          </Button>
        }
      />
    );

  const filterPopover = (
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
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
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
  );

  const tokens =
    category !== "all"
      ? [
          {
            key: "kategori",
            label: expenseCategoryLabel(category),
            title: `Kategori: ${expenseCategoryLabel(category)}`,
            onRemove: () => set({ kategori: null }),
          },
        ]
      : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Giderler"
        description="İşletme giderlerini kaydedin; seçtiğiniz dönemin net kârını görün."
        context={<PeriodControl kinds={KINDS} defaultKind="ay" todayMs={todayMs} />}
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Gider ara"
            aria-label="Gider ara"
          />
        }
        secondary={filterPopover}
        primary={<ToolbarAction prominent icon={Plus} label="Yeni gider" onClick={openCreate} />}
      />

      {loadFailed ? (
        <ErrorState
          title="Giderler yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : totalCount === 0 ? (
        <EmptyState
          icon={ReceiptTurkishLira}
          title="Henüz gider yok"
          description="Kira, maaş, malzeme gibi giderlerinizi ekleyin; net kârınız otomatik hesaplansın."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Yeni gider
            </Button>
          }
        />
      ) : (
        <>
          <MetricStrip aria-label="Dönem özeti">
            <Metric label="Gelir" value={formatMoney(income)} context="Tahsil edilen ödemeler" />
            <Metric label="Gider" value={formatMoney(total)} context={`${expenses.length} kayıt`} />
            <Metric
              label="Net kâr"
              value={formatMoney(net)}
              tone={net < 0 ? "danger" : "default"}
              context={margin != null ? `%${margin} marj` : "Gelir − gider"}
            />
          </MetricStrip>

          <div className="space-y-4">
            <FilterBar
              tokens={tokens}
              onClearAll={hasFilters ? clearFilters : undefined}
              result={`${rows.length} gider · ${formatMoney(rowsTotal)}`}
            />
            <DataTable
              caption="Giderler"
              columns={columns}
              rows={rows}
              getRowId={(e) => e.id}
              defaultSort={{ key: "date", dir: "desc" }}
              onRowActivate={(e) => setEditing(e)}
              renderMobileRow={renderMobileRow}
              empty={empty}
              footer={
                <span>
                  {rows.length} gider · {formatMoney(rowsTotal)}
                </span>
              }
            />
          </div>
        </>
      )}

      <FormSheet
        open={formOpen}
        onOpenChange={(o) => !o && closeForm()}
        title={editing ? "Gideri düzenle" : "Yeni gider"}
        description={editing ? editing.title : "Açıklama, tutar ve tarih yeterli."}
      >
        <ExpenseForm
          key={editing?.id ?? "yeni"}
          expense={editing ?? undefined}
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
            <DialogTitle>Gideri sil</DialogTitle>
            <DialogDescription>“{deleting?.title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.</DialogDescription>
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
