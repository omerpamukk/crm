"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Staff } from "@/types/database";

import { staffSchema, type StaffInput } from "./schema";
import { createStaff, updateStaff } from "./actions";

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
      commission_rate: staff?.commission_rate?.toString() ?? "",
      is_active: staff?.is_active ?? true,
      note: staff?.note ?? "",
    },
  });

  async function onSubmit(values: StaffInput) {
    setFormError(null);
    const result = isEdit
      ? await updateStaff(staff!.id, values)
      : await createStaff(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Personel güncellendi" : "Personel eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Ad soyad *</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name && (
          <p className="text-sm text-danger">{errors.full_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Ünvan</Label>
          <Input
            id="title"
            placeholder="Kuaför, terapist, danışman..."
            {...register("title")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commission_rate">Komisyon (%)</Label>
          <Input
            id="commission_rate"
            inputMode="decimal"
            placeholder="0"
            {...register("commission_rate")}
          />
          {errors.commission_rate && (
            <p className="text-sm text-danger">
              {errors.commission_rate.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-danger">{errors.email.message}</p>
          )}
        </div>
      </div>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            Aktif personel (pasif personel randevu atamasında gizlenir)
          </label>
        )}
      />

      <div className="space-y-2">
        <Label htmlFor="note">Not</Label>
        <Textarea id="note" rows={2} {...register("note")} />
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
        </Button>
      </div>
    </form>
  );
}
