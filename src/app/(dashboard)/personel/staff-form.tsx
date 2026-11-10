"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/shared/form-sheet";
import type { Staff } from "@/types/database";

import { staffSchema, type StaffInput } from "./schema";
import { createStaff, updateStaff } from "./actions";

/** Personel ekleme / düzenleme formu. Not, "Gelişmiş" altında kapalı başlar. */
export function StaffForm({
  staff,
  onSuccess,
  onCancel,
}: {
  staff?: Staff;
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
    },
  });

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
