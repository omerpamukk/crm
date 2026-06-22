"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Service } from "@/types/database";

import { serviceSchema, type ServiceInput } from "./schema";
import { createService, updateService } from "./actions";

export function ServiceForm({
  service,
  onSuccess,
  onCancel,
}: {
  service?: Service;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(service);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      category: service?.category ?? "",
      duration_min: service?.duration_min?.toString() ?? "",
      price: service?.price?.toString() ?? "",
    },
  });

  async function onSubmit(values: ServiceInput) {
    setFormError(null);
    const result = isEdit
      ? await updateService(service!.id, values)
      : await createService(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Hizmet güncellendi" : "Hizmet eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Hizmet adı *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-danger">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <Input
          id="category"
          placeholder="Saç, cilt bakımı, ..."
          {...register("category")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="duration_min">Süre (dakika)</Label>
          <Input
            id="duration_min"
            inputMode="numeric"
            placeholder="30"
            {...register("duration_min")}
          />
          {errors.duration_min && (
            <p className="text-sm text-danger">{errors.duration_min.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Fiyat (₺)</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="250"
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
