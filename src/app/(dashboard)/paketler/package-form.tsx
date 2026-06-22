"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateTimeLocal } from "@/lib/format";
import type { Package } from "@/types/database";

import { packageSchema, type PackageInput } from "./schema";
import { createPackage, updatePackage } from "./actions";

export interface CustomerOption {
  id: string;
  full_name: string;
}

export function PackageForm({
  pkg,
  customers,
  onSuccess,
  onCancel,
}: {
  pkg?: Package;
  customers: CustomerOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(pkg);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PackageInput>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      customer_id: pkg?.customer_id ?? "",
      service_name: pkg?.service_name ?? "",
      total_sessions: pkg?.total_sessions?.toString() ?? "",
      remaining_sessions: pkg?.remaining_sessions?.toString() ?? "",
      purchased_at: pkg?.purchased_at
        ? toDateTimeLocal(pkg.purchased_at).slice(0, 10)
        : "",
      price: pkg?.price?.toString() ?? "",
    },
  });

  async function onSubmit(values: PackageInput) {
    setFormError(null);
    const result = isEdit
      ? await updatePackage(pkg!.id, values)
      : await createPackage(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Paket güncellendi" : "Paket eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer_id">Müşteri *</Label>
        <Controller
          control={control}
          name="customer_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="customer_id" className="w-full">
                <SelectValue placeholder="Müşteri seçin" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.customer_id && (
          <p className="text-sm text-danger">{errors.customer_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_name">Paket / hizmet adı</Label>
        <Input
          id="service_name"
          placeholder="10 seans cilt bakımı"
          {...register("service_name")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="total_sessions">Toplam seans</Label>
          <Input
            id="total_sessions"
            inputMode="numeric"
            placeholder="10"
            {...register("total_sessions")}
          />
          {errors.total_sessions && (
            <p className="text-sm text-danger">
              {errors.total_sessions.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="remaining_sessions">Kalan seans</Label>
          <Input
            id="remaining_sessions"
            inputMode="numeric"
            placeholder="10"
            {...register("remaining_sessions")}
          />
          {errors.remaining_sessions && (
            <p className="text-sm text-danger">
              {errors.remaining_sessions.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchased_at">Satın alma tarihi</Label>
          <Input id="purchased_at" type="date" {...register("purchased_at")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Fiyat (₺)</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="2500"
            {...register("price")}
          />
          {errors.price && (
            <p className="text-sm text-danger">{errors.price.message}</p>
          )}
        </div>
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
