"use client";

import { useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/shared/form-sheet";
import { STAFF_COLORS, nextStaffColor, isStaffColor, type StaffColor } from "@/lib/staff-colors";
import { cn } from "@/lib/utils";
import type { Staff } from "@/types/database";

import { staffSchema, type StaffInput } from "./schema";
import { createStaff, updateStaff } from "./actions";

/** Personel ekleme / düzenleme formu. Not, "Gelişmiş" altında kapalı başlar. */
export function StaffForm({
  staff,
  services,
  serviceIds,
  usedColors,
  onSuccess,
  onCancel,
}: {
  staff?: Staff;
  /** İşletmenin hizmetleri (seçim listesi). */
  services: { id: string; name: string }[];
  /** Düzenlenen personelin verdiği hizmetler; boş = tüm hizmetler. */
  serviceIds: string[];
  /** Diğer personelin renkleri: yeni personele boş renk önerilir. */
  usedColors: (string | null | undefined)[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(staff);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StaffInput>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      full_name: staff?.full_name ?? "",
      title: staff?.title ?? "",
      phone: staff?.phone ?? "",
      email: staff?.email ?? "",
      commission_rate: staff?.commission_rate ? String(staff.commission_rate) : "",
      is_active: staff?.is_active ?? true,
      note: staff?.note ?? "",
      color: isStaffColor(staff?.color) ? staff.color : staff ? null : nextStaffColor(usedColors),
      all_services: serviceIds.length === 0,
      service_ids: serviceIds,
    },
  });
  const allServices = useWatch({ control, name: "all_services" });

  async function onSubmit(values: StaffInput) {
    setFormError(null);
    const result = isEdit ? await updateStaff(staff!.id, values) : await createStaff(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEdit ? "Personel güncellendi" : "Personel eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="full_name">Ad soyad *</Label>
        <Input id="full_name" autoComplete="off" {...register("full_name")} />
        {errors.full_name && <p className="text-sm text-danger-text">{errors.full_name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Ünvan</Label>
          <Input id="title" placeholder="Örn. Uzman, danışman" {...register("title")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commission_rate">Komisyon (%)</Label>
          <Input id="commission_rate" inputMode="decimal" placeholder="0" {...register("commission_rate")} />
          {errors.commission_rate && <p className="text-sm text-danger-text">{errors.commission_rate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" type="tel" inputMode="tel" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" inputMode="email" autoComplete="off" {...register("email")} />
          {errors.email && <p className="text-sm text-danger-text">{errors.email.message}</p>}
        </div>
      </div>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium">
                Aktif personel
              </p>
              <p id="is_active_hint" className="text-subhead text-label-2">
                Pasif personel randevu atamasında görünmez.
              </p>
            </div>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              label="Aktif personel"
              aria-describedby="is_active_hint"
            />
          </div>
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Takvim rengi</legend>
            <ColorPicker value={field.value ?? null} onChange={field.onChange} />
          </fieldset>
        )}
      />

      <div className="space-y-3">
        <Controller
          control={control}
          name="all_services"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-medium">Tüm hizmetleri verir</p>
                <p id="all_services_hint" className="text-subhead text-label-2">
                  Kapatırsanız yalnızca seçtiğiniz hizmetlerde randevu alır.
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Tüm hizmetleri verir"
                aria-describedby="all_services_hint"
              />
            </div>
          )}
        />
        {!allServices && (
          <Controller
            control={control}
            name="service_ids"
            render={({ field }) =>
              services.length === 0 ? (
                <p className="rounded-xl bg-fill px-4 py-3 text-subhead text-label-2">
                  Henüz hizmet yok. Önce Hizmetler sayfasından hizmet ekleyin.
                </p>
              ) : (
                <fieldset className="space-y-1" aria-describedby={errors.service_ids ? "service_ids_err" : undefined}>
                  <legend className="sr-only">Verdiği hizmetler</legend>
                  <div className="surface-flat max-h-64 overflow-y-auto py-1">
                    {services.map((svc) => {
                      const on = field.value.includes(svc.id);
                      return (
                        <label
                          key={svc.id}
                          className="hover-tint flex min-h-11 cursor-pointer items-center gap-3 px-4 text-[0.9375rem]"
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) =>
                              field.onChange(
                                e.target.checked ? [...field.value, svc.id] : field.value.filter((x) => x !== svc.id)
                              )
                            }
                            className="focus-ring size-5 shrink-0 accent-[var(--primary-fill)]"
                          />
                          <span className="min-w-0 truncate">{svc.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.service_ids && (
                    <p id="service_ids_err" className="text-sm text-danger-text">
                      {errors.service_ids.message}
                    </p>
                  )}
                </fieldset>
              )
            }
          />
        )}
      </div>

      <Disclosure title="Gelişmiş" contentClassName="space-y-2 pt-3">
        <Label htmlFor="note">Not</Label>
        <Textarea id="note" rows={3} placeholder="Yalnızca yönetici görür." {...register("note")} />
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
          {isSubmitting ? "Kaydediliyor" : isEdit ? "Kaydet" : "Personel ekle"}
        </Button>
      </FormActions>
    </form>
  );
}

/** Sekiz renkten biri; ← → ile gezilir. Seçili rengin üstünde ✓ olur. */
function ColorPicker({ value, onChange }: { value: StaffColor | null; onChange: (v: StaffColor) => void }) {
  const current = Math.max(
    0,
    STAFF_COLORS.findIndex((c) => c.key === value)
  );
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = STAFF_COLORS[(current + dir + STAFF_COLORS.length) % STAFF_COLORS.length];
    onChange(next.key);
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-color="${next.key}"]`);
    el?.focus();
  }
  return (
    <div role="radiogroup" aria-label="Takvim rengi" onKeyDown={onKeyDown} className="flex flex-wrap gap-1">
      {STAFF_COLORS.map((c, i) => {
        const on = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.label}
            title={c.label}
            data-color={c.key}
            tabIndex={i === current ? 0 : -1}
            onClick={() => onChange(c.key)}
            className="focus-ring pressable grid size-11 place-items-center rounded-full"
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full",
                c.dot,
                on && "ring-2 ring-label ring-offset-2 ring-offset-surface"
              )}
            >
              {on && <Check aria-hidden className="size-4 text-on-primary-fill" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
