"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  ListFilter,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";

import { canChangeArrival } from "@/lib/appointment-status";
import { APPOINTMENT_STATUSES, appointmentStatusLabel, appointmentStatusVariant } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { UserRole } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge, StatusIcons } from "@/components/shared/status";
import { SwipeRow } from "@/components/shared/swipe-row";

import { AppointmentDetailSheet } from "./appointment-detail-sheet";
import {
  AppointmentForm,
  type CustomerOption,
  type PackageOption,
  type ServiceOption,
  type StaffOption,
} from "./appointment-form";
import { AppointmentRowActions, rowAvailability } from "./appointment-row-actions";
import {
  isRangeKind,
  parseDateKey,
  resolveRange,
  shiftAnchor,
  toDateKey,
  type RangeKind,
} from "./date-range";
import type { AppointmentRow, RowHandlers, RowPermissions } from "./types";
import { useAppointmentActions } from "./use-appointment-actions";
import { useRandevuParams } from "./use-randevu-params";

const noopSubscribe = () => () => {};
/** Sunucuda false, istemcide true: tarihe bağlı içerik hydration uyuşmazlığı yaratmasın. */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

function endTime(a: AppointmentRow): string | null {
  const min = a.service?.duration_min;
  if (!min) return null;
  return formatTime(new Date(new Date(a.starts_at).getTime() + min * 60_000).toISOString());
}

function statusText(a: AppointmentRow, withTime: boolean): string {
  const status = a.status ?? "planned";
  if (status === "arrived" && withTime && a.arrived_at) return `Geldi · ${formatTime(a.arrived_at)}`;
  return appointmentStatusLabel(status);
}

function StatusCell({ a, withTime = true }: { a: AppointmentRow; withTime?: boolean }) {
  const status = a.status ?? "planned";
  return (
    <StatusBadge
      variant={appointmentStatusVariant(status)}
      icon={status === "cancelled" ? StatusIcons.cancelled : undefined}
    >
      {statusText(a, withTime)}
    </StatusBadge>
  );
}

function OnlineTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap text-primary-text">
      <Globe aria-hidden className="size-2.5" />
      Online
    </span>
  );
}

export function AppointmentsView({
  appointments,
  customers,
  services,
  staff,
  packages,
  loadFailed,
  role,
  profileStaffId,
}: {
  appointments: AppointmentRow[];
  customers: CustomerOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  packages: PackageOption[];
  loadFailed: boolean;
  role: UserRole;
  profileStaffId: string | null;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const { params, set } = useRandevuParams();
  const actions = useAppointmentActions();

  const [today] = useState(() => new Date());
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [formRow, setFormRow] = useState<AppointmentRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AppointmentRow | null>(null);
  const [completing, setCompleting] = useState<AppointmentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage = can(role, "randevu_yonet");
  const createOpen = canManage && params.get("yeni") === "1";
  const sheetOpen = createOpen || editOpen;
  const sheetRow = createOpen ? null : formRow;

  // ---- URL'deki durum ----
  const kind: RangeKind = isRangeKind(params.get("aralik")) ? (params.get("aralik") as RangeKind) : "gun";
  const range = useMemo(
    () => resolveRange(kind, params.get("tarih"), params.get("bas"), params.get("bit"), today),
    [kind, params, today]
  );
  const statusParam = params.get("durum") ?? "all";
  const status = APPOINTMENT_STATUSES.some((s) => s.value === statusParam) ? statusParam : "all";
  const staffParam = params.get("personel") ?? "all";
  const staffId = staff.some((s) => s.id === staffParam) ? staffParam : "all";
  const serviceParam = params.get("hizmet") ?? "all";
  const serviceId = services.some((s) => s.id === serviceParam) ? serviceParam : "all";

  // ---- Süzme ----
  const inRange = useMemo(
    () =>
      appointments.filter((a) => {
        const t = new Date(a.starts_at).getTime();
        return t >= range.start.getTime() && t < range.end.getTime();
      }),
    [appointments, range]
  );

  const scoped = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr-TR");
    return inRange.filter((a) => {
      if (staffId !== "all" && a.staff_member_id !== staffId) return false;
      if (serviceId !== "all" && a.service_id !== serviceId) return false;
      if (s) {
        const hay = `${a.customer?.full_name ?? ""} ${a.customer?.phone ?? ""} ${a.service?.name ?? ""} ${a.staff_member?.full_name ?? ""}`.toLocaleLowerCase("tr-TR");
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [inRange, q, staffId, serviceId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of scoped) c[a.status ?? "planned"] = (c[a.status ?? "planned"] ?? 0) + 1;
    return c;
  }, [scoped]);

  const rows = useMemo(
    () => (status === "all" ? scoped : scoped.filter((a) => (a.status ?? "planned") === status)),
    [scoped, status]
  );

  const filterCount = (staffId !== "all" ? 1 : 0) + (serviceId !== "all" ? 1 : 0);
  const hasFilters = filterCount > 0 || status !== "all" || q.trim() !== "";

  function clearFilters() {
    setQ("");
    set({ q: null, durum: null, personel: null, hizmet: null });
  }

  // ---- Tarih aralığı denetimi ----
  function changeKind(next: RangeKind) {
    const lastDay = new Date(range.end.getTime() - 1);
    set({
      aralik: next === "gun" ? null : next,
      tarih: null,
      bas: next === "ozel" ? toDateKey(range.start) : null,
      bit: next === "ozel" ? toDateKey(lastDay) : null,
    });
  }
  function shift(dir: -1 | 1) {
    set({ tarih: shiftAnchor(kind, params.get("tarih"), dir, today) });
  }

  // ---- Eylemler ----
  function permissionsOf(a: AppointmentRow): RowPermissions {
    return {
      arrival: canChangeArrival(role, profileStaffId, a.staff_member_id),
      manage: canManage,
    };
  }

  const handlers: RowHandlers = {
    onArrive: actions.arrive,
    onUndoArrive: actions.undoArrive,
    onComplete: (a) => {
      // Pakete bağlı randevuyu tamamlamak seans düşer: önce onay.
      if (a.package_id) setCompleting(a);
      else void actions.setStatus(a, "completed");
    },
    onNoShow: (a) => void actions.setStatus(a, "no_show"),
    onCancel: (a) => void actions.setStatus(a, "cancelled"),
    onEdit: (a) => {
      setDetailId(null);
      setFormRow(a);
      setEditOpen(true);
    },
    onDelete: (a) => {
      setDetailId(null);
      setDeleting(a);
    },
  };

  function openCreate() {
    set({ yeni: "1" });
  }
  function closeSheet() {
    setEditOpen(false);
    if (params.get("yeni")) set({ yeni: null });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const ok = await actions.remove(deleting);
    setBusy(false);
    if (ok) setDeleting(null);
  }

  async function confirmComplete() {
    if (!completing) return;
    setBusy(true);
    const ok = await actions.setStatus(completing, "completed");
    setBusy(false);
    if (ok) setCompleting(null);
  }

  const detail = detailId ? (appointments.find((a) => a.id === detailId) ?? null) : null;

  // ---- Tablo ----
  const columns: DataTableColumn<AppointmentRow>[] = [
    {
      key: "when",
      header: "Tarih / saat",
      sortValue: (a) => new Date(a.starts_at).getTime(),
      cell: (a) => (
        <span className="whitespace-nowrap tabular-nums">
          {kind !== "gun" && (
            <span className="text-label-2">
              {new Date(a.starts_at).toLocaleDateString("tr-TR", SHORT_DATE)}
              {" · "}
            </span>
          )}
          <span className="font-semibold">{formatTime(a.starts_at)}</span>
        </span>
      ),
    },
    {
      key: "customer",
      header: "Müşteri",
      sortValue: (a) => a.customer?.full_name ?? "",
      cell: (a) => {
        const name = a.customer?.full_name ?? "Müşteri";
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={name} size="sm" />
            {a.customer_id ? (
              <Link
                href={`/musteriler/${a.customer_id}`}
                className="min-w-0 truncate font-medium hover:text-primary-text hover:underline"
                title={name}
              >
                {name}
              </Link>
            ) : (
              <span className="min-w-0 truncate font-medium" title={name}>
                {name}
              </span>
            )}
            {a.booked_online && <OnlineTag />}
          </span>
        );
      },
    },
    {
      key: "service",
      header: "Hizmet",
      hideBelow: "@2xl",
      sortValue: (a) => a.service?.name ?? "",
      cell: (a) => (
        <span className="block max-w-[14rem] truncate" title={a.service?.name ?? undefined}>
          {a.service?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "staff",
      header: "Personel",
      hideBelow: "@3xl",
      sortValue: (a) => a.staff_member?.full_name ?? "",
      cell: (a) => <span className="whitespace-nowrap">{a.staff_member?.full_name ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Durum",
      sortValue: (a) => appointmentStatusLabel(a.status ?? "planned"),
      cell: (a) => <StatusCell a={a} />,
    },
    {
      key: "price",
      header: "Ücret",
      align: "right",
      hideBelow: "@4xl",
      sortValue: (a) => a.price,
      cell: (a) => (a.price != null ? <Money amount={a.price} /> : <span className="text-label-3">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">İşlemler</span>,
      align: "right",
      cell: (a) => (
        <AppointmentRowActions appointment={a} permissions={permissionsOf(a)} handlers={handlers} />
      ),
    },
  ];

  function renderMobileRow(a: AppointmentRow) {
    const av = rowAvailability(a, permissionsOf(a));
    const name = a.customer?.full_name ?? "Müşteri";
    const end = endTime(a);
    const second = [a.service?.name, a.staff_member?.full_name].filter(Boolean).join(" · ");
    return (
      <SwipeRow
        leading={
          av.arrive
            ? {
                label: "Geldi",
                icon: UserCheck,
                tone: "positive",
                onAction: () => void handlers.onArrive(a),
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={() => setDetailId(a.id)}
          aria-label={`${name}, ${formatTime(a.starts_at)}, ${statusText(a, true)}. Ayrıntıyı aç`}
          className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-press focus-visible:outline-offset-[-3px]"
        >
          <span className="w-12 shrink-0 tabular-nums">
            <b className="block text-[0.9375rem] font-semibold">{formatTime(a.starts_at)}</b>
            {end && <span className="block text-[0.75rem] text-label-2">{end}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1rem] leading-[1.3125rem] font-semibold break-words">{name}</span>
            {second && <span className="block truncate text-subhead text-label-2">{second}</span>}
          </span>
          <StatusCell a={a} withTime={false} />
        </button>
      </SwipeRow>
    );
  }

  // ---- Boş durumlar ----
  const noCustomers = customers.length === 0;
  const empty =
    inRange.length === 0 ? (
      noCustomers ? (
        <EmptyState
          variant="inline"
          icon={Users}
          title="Önce bir müşteri ekleyin"
          description="Randevu oluşturmak için en az bir müşteri gerekir."
          action={
            can(role, "musteri_ekle") ? (
              <Button asChild>
                <Link href="/musteriler?yeni=1">
                  <Plus />
                  Yeni müşteri
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState
          variant="inline"
          icon={CalendarDays}
          title="Bu aralıkta randevu yok"
          description={
            canManage
              ? "Başka bir tarih seçin ya da yeni bir randevu oluşturun."
              : "Başka bir tarih seçerek diğer randevulara bakabilirsiniz."
          }
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus />
                Yeni randevu
              </Button>
            ) : undefined
          }
        />
      )
    ) : (
      <EmptyState
        variant="inline"
        icon={CalendarDays}
        title="Sonuç yok"
        description="Seçili filtrelere uyan randevu yok. Filtreleri temizleyip tekrar deneyin."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Filtreleri temizle
          </Button>
        }
      />
    );

  // ---- Başlık çubuğu parçaları ----
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
          <span
            aria-live="polite"
            className="min-w-[8.5rem] px-2 text-center text-[0.9375rem] font-semibold whitespace-nowrap"
          >
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
        <div className="space-y-1.5">
          <Label htmlFor="f-personel">Personel</Label>
          <Select value={staffId} onValueChange={(v) => set({ personel: v === "all" ? null : v })}>
            <SelectTrigger id="f-personel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm personel</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-hizmet">Hizmet</Label>
          <Select value={serviceId} onValueChange={(v) => set({ hizmet: v === "all" ? null : v })}>
            <SelectTrigger id="f-hizmet" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm hizmetler</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filterCount > 0 && (
          <Button variant="plain" size="sm" onClick={() => set({ personel: null, hizmet: null })}>
            Filtreleri temizle
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );

  const tokens = [
    ...(staffId !== "all"
      ? [
          {
            key: "personel",
            label: staff.find((s) => s.id === staffId)?.full_name ?? "Personel",
            title: `Personel: ${staff.find((s) => s.id === staffId)?.full_name ?? ""}`,
            onRemove: () => set({ personel: null }),
          },
        ]
      : []),
    ...(serviceId !== "all"
      ? [
          {
            key: "hizmet",
            label: services.find((s) => s.id === serviceId)?.name ?? "Hizmet",
            title: `Hizmet: ${services.find((s) => s.id === serviceId)?.name ?? ""}`,
            onRemove: () => set({ hizmet: null }),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Randevular"
        description="Müşteri geldiğinde Geldi'ye basın; randevuları gün, durum ve personele göre süzün."
        context={context}
        search={
          <SearchField
            variant="glass"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              set({ q: v.trim() ? v : null });
            }}
            placeholder="Randevu ara"
            aria-label="Randevu ara"
          />
        }
        secondary={filterPopover}
        primary={
          canManage ? (
            <ToolbarAction
              prominent
              icon={Plus}
              label="Yeni randevu"
              onClick={openCreate}
              disabled={noCustomers}
            />
          ) : undefined
        }
      />

      {loadFailed ? (
        <ErrorState
          title="Randevular yüklenemedi"
          description="Bağlantıda bir sorun olabilir. Tekrar deneyin; sorun sürerse sayfayı yenileyin."
          onRetry={() => router.refresh()}
        />
      ) : !mounted ? (
        <PageSkeleton kpis={0} rows={6} />
      ) : (
        <div className="space-y-4">
          {inRange.length > 0 && (
            <FilterBar
              scope={{
                "aria-label": "Randevu durumu",
                value: status,
                onValueChange: (v) => set({ durum: v === "all" ? null : v }),
                items: [
                  { value: "all", label: "Tümü", count: scoped.length },
                  ...APPOINTMENT_STATUSES.map((s) => ({
                    value: s.value,
                    label: s.label,
                    count: counts[s.value] ?? 0,
                  })),
                ],
              }}
              tokens={tokens}
              onClearAll={hasFilters ? clearFilters : undefined}
              result={`${rows.length} randevu`}
            />
          )}
          <DataTable
            caption="Randevular"
            columns={columns}
            rows={rows}
            getRowId={(a) => a.id}
            defaultSort={{ key: "when", dir: "asc" }}
            onRowActivate={canManage ? (a) => handlers.onEdit(a) : undefined}
            renderMobileRow={renderMobileRow}
            empty={empty}
          />
        </div>
      )}

      {/* Yeni randevu / Düzenle */}
      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="auto">
          <SheetHeader>
            <SheetTitle>{sheetRow ? "Randevuyu düzenle" : "Yeni randevu"}</SheetTitle>
            <SheetDescription>
              {sheetRow ? (sheetRow.customer?.full_name ?? "Müşteri") : "Müşteri, hizmet ve saati seçin."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-5">
            <AppointmentForm
              appointment={sheetRow ?? undefined}
              customers={customers}
              services={services}
              staff={staff}
              packages={packages}
              onSuccess={() => {
                closeSheet();
                router.refresh();
              }}
              onCancel={closeSheet}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Telefonda satır ayrıntısı */}
      <AppointmentDetailSheet
        appointment={detail}
        open={detail !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
        permissions={detail ? permissionsOf(detail) : { arrival: false, manage: false }}
        handlers={handlers}
      />

      {/* Silme onayı */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevuyu sil</DialogTitle>
            <DialogDescription>
              {deleting?.customer?.full_name ?? "Müşteri"} için {deleting ? formatTime(deleting.starts_at) : ""} randevusu
              kalıcı olarak silinecek. Bu işlem geri alınamaz.
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

      {/* Pakete bağlı randevuyu tamamlama onayı */}
      <Dialog open={completing !== null} onOpenChange={(o) => !o && !busy && setCompleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevuyu tamamla</DialogTitle>
            <DialogDescription>
              Bu randevu bir pakete bağlı. Tamamlandığında paketten 1 seans düşülür ve bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCompleting(null)} disabled={busy}>
              Vazgeç
            </Button>
            <Button onClick={confirmComplete} disabled={busy}>
              {busy ? "Kaydediliyor" : "Tamamla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
