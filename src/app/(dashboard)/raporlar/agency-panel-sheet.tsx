"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, MoreHorizontal, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AGENCY_DURATIONS } from "@/lib/constants";
import type { AgencyAccess } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Disclosure } from "@/components/ui/disclosure";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToolbarAction } from "@/components/layout/toolbar-action";
import { FormActions, FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { StatusBadge } from "@/components/shared/status";

import { createAgencyAccess, deleteAgencyAccess, updateAgencyAccess } from "./agency-actions";
import { agencySchema, SHARE_SECTIONS, type AgencyInput } from "./agency-schema";

const ALL_KEYS: string[] = SHARE_SECTIONS.map((s) => s.key);

function isExpired(a: AgencyAccess, nowMs: number): boolean {
  return !a.is_active || (!!a.expires_at && new Date(a.expires_at).getTime() <= nowMs);
}

function remainingText(a: AgencyAccess, nowMs: number): string {
  if (!a.is_active) return "Pasif";
  if (!a.expires_at) return "Süresiz";
  const diff = new Date(a.expires_at).getTime() - nowMs;
  if (diff <= 0) return "Süresi doldu";
  const days = Math.ceil(diff / 86_400_000);
  return days >= 30 ? `${Math.floor(days / 30)} ay kaldı` : `${days} gün kaldı`;
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function AccessForm({
  access,
  onDone,
  onCancel,
}: {
  access: AgencyAccess | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = access !== null;
  const [token] = useState(newToken);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgencyInput>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: access?.name ?? "",
      email: access?.email ?? "",
      sections: access ? access.sections.filter((k) => ALL_KEYS.includes(k)) : ALL_KEYS,
      days: isEdit ? "keep" : "180",
      note: access?.note ?? "",
    },
  });
  const selected = useWatch({ control, name: "sections" });
  const allSelected = selected.length === ALL_KEYS.length;

  async function onSubmit(v: AgencyInput) {
    setFormError(null);
    const result = access
      ? await updateAgencyAccess(access.id, {
          name: v.name,
          email: v.email,
          sections: v.sections,
          note: v.note,
          days: v.days === "keep" ? undefined : Number(v.days),
          keepDuration: v.days === "keep",
        })
      : await createAgencyAccess({
          name: v.name,
          email: v.email,
          token,
          sections: v.sections,
          permission: "view",
          days: Number(v.days),
          note: v.note,
        });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEdit ? "Erişim güncellendi" : "Erişim verildi");
    onDone();
  }

  const durations = isEdit ? [{ value: "keep", label: "Mevcut süreyi koru" }, ...AGENCY_DURATIONS] : [...AGENCY_DURATIONS];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="ag-name">Ajans ya da kişi adı *</Label>
        <Input id="ag-name" autoComplete="off" placeholder="Örn. Dijital Ajans" {...register("name")} />
        {errors.name && <p className="text-sm text-danger-text">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ag-email">E-posta</Label>
        <Input id="ag-email" type="email" inputMode="email" autoComplete="off" placeholder="ajans@ornek.com" {...register("email")} />
        {errors.email && <p className="text-sm text-danger-text">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ag-days">Erişim süresi</Label>
        <Controller
          control={control}
          name="days"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ag-days" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <ListGroup
          title="Ajansın göreceği bölümler"
          detail={`${selected.length} / ${ALL_KEYS.length}`}
          action={
            <button
              type="button"
              onClick={() => setValue("sections", allSelected ? [] : ALL_KEYS, { shouldValidate: true })}
              className="focus-ring rounded text-[0.8125rem] font-semibold whitespace-nowrap text-primary-text"
            >
              {allSelected ? "Tümünü kaldır" : "Tümünü seç"}
            </button>
          }
          inset={16}
          aria-label="Ajansın göreceği bölümler"
        >
          {SHARE_SECTIONS.map((s) => {
            const on = selected.includes(s.key);
            return (
              <ListRow
                key={s.key}
                title={s.label}
                subtitle={s.desc}
                trailing={
                  <Switch
                    checked={on}
                    onCheckedChange={(next) =>
                      setValue("sections", next ? [...selected, s.key] : selected.filter((k) => k !== s.key), { shouldValidate: true })
                    }
                    label={`${s.label} ${on ? "gösterilecek" : "gösterilmeyecek"}`}
                  />
                }
              />
            );
          })}
        </ListGroup>
        {errors.sections && <p className="text-sm text-danger-text">{errors.sections.message}</p>}
      </div>

      <Disclosure title="Gelişmiş" contentClassName="space-y-2 pt-3">
        <Label htmlFor="ag-note">Not</Label>
        <Textarea id="ag-note" rows={3} placeholder="Yalnızca siz görürsünüz." {...register("note")} />
      </Disclosure>

      {formError && (
        <p role="alert" className="text-sm text-danger-text">
          {formError}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor" : isEdit ? "Kaydet" : "Erişim ver"}
        </Button>
      </FormActions>
    </form>
  );
}

type View = { kind: "list" } | { kind: "form"; access: AgencyAccess | null };

/**
 * Ajans paneli: işletme raporlarını bir ajansa salt okunur bağlantıyla gösterir.
 * Araç çubuğundaki "Ajans paneli" düğmesi bir panel açar; içinde mevcut erişimler
 * listelenir, yeni erişim verilir ya da düzenlenir.
 */
export function AgencyPanelSheet({ existing }: { existing: AgencyAccess[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [deleting, setDeleting] = useState<AgencyAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [nowMs] = useState(() => Date.now());

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) setView({ kind: "list" });
  }

  async function copyLink(a: AgencyAccess) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/ajans/${a.token}`);
      toast.success("Bağlantı kopyalandı");
    } catch {
      toast.error("Bağlantı kopyalanamadı. Tarayıcı izin vermiyor olabilir.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteAgencyAccess(deleting.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Erişim silindi");
    setDeleting(null);
    router.refresh();
  }

  const isForm = view.kind === "form";

  return (
    <>
      <ToolbarAction icon={Store} label="Ajans paneli" mobile="icon" onClick={() => setOpen(true)} />

      <FormSheet
        open={open}
        onOpenChange={handleOpenChange}
        title={isForm ? (view.access ? "Erişimi düzenle" : "Erişim ver") : "Ajans paneli"}
        description={
          isForm
            ? "Ajansın hangi bölümleri göreceğini seçin."
            : "Raporlarınızı ajansınıza salt okunur bir bağlantıyla gösterin. Bağlantıyı istediğiniz zaman silebilirsiniz."
        }
        className="sm:max-w-[32rem]"
      >
        {isForm ? (
          <AccessForm
            key={view.access?.id ?? "yeni"}
            access={view.access}
            onDone={() => {
              setView({ kind: "list" });
              router.refresh();
            }}
            onCancel={() => setView({ kind: "list" })}
          />
        ) : (
          <div className="space-y-4">
            {existing.length > 0 && (
              <ListGroup inset={16} aria-label="Ajans erişimleri">
                {existing.map((a) => {
                  const expired = isExpired(a, nowMs);
                  return (
                    <ListRow
                      key={a.id}
                      title={a.name}
                      subtitle={`${a.sections.length} bölüm · ${remainingText(a, nowMs)}`}
                      trailing={
                        <>
                          {expired ? <StatusBadge variant="secondary">Pasif</StatusBadge> : <StatusBadge variant="positive">Aktif</StatusBadge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="max-md:size-11" aria-label={`${a.name} erişimi işlemleri`}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => copyLink(a)}>
                                <Link2 />
                                Bağlantıyı kopyala
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setView({ kind: "form", access: a })}>
                                <Pencil />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(a)}>
                                <Trash2 />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      }
                    />
                  );
                })}
              </ListGroup>
            )}
            {existing.length === 0 && (
              <p className="text-[0.9375rem] text-label-2">
                Henüz kimseye erişim vermediniz. Erişim verdiğinizde ajansa özel bir bağlantı oluşur; bağlantıyı kopyalayıp gönderirsiniz.
              </p>
            )}
            <Button className="w-full" onClick={() => setView({ kind: "form", access: null })}>
              <Plus />
              Erişim ver
            </Button>
          </div>
        )}
      </FormSheet>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erişimi sil</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” için verdiğiniz bağlantı kalıcı olarak kapanacak. Bu işlem geri alınamaz.
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
    </>
  );
}
