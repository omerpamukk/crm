"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/shared/form-sheet";
import type { Service } from "@/types/database";

import { serviceSchema, type ServiceInput } from "./schema";
import { createService, updateService } from "./actions";

/** Hizmet ekleme / düzenleme formu. Ad dışındaki alanlar isteğe bağlıdır. */
export function ServiceForm({
  service,
  categories,
  onSuccess,
  onCancel,
}: {
  service?: Service;
  /** Mevcut kategoriler: yazarken öneri olarak sunulur. */
  categories: string[];
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
    const result = isEdit ? await updateService(service!.id, values) : await createService(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEdit ? "Hizmet güncellendi" : "Hizmet eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Hizmet adı *</Label>
        <Input id="name" autoComplete="off" placeholder="Örn. Cilt bakımı" {...register("name")} />
        {errors.name && <p className="text-sm text-danger-text">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <Input id="category" list="service-categories" autoComplete="off" placeholder="Örn. Bakım" {...register("category")} />
        <datalist id="service-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="duration_min">Süre (dakika)</Label>
          <Input id="duration_min" inputMode="numeric" placeholder="30" {...register("duration_min")} />
          {errors.duration_min && <p className="text-sm text-danger-text">{errors.duration_min.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Fiyat (₺)</Label>
          <Input id="price" inputMode="decimal" placeholder="250" {...register("price")} />
          {errors.price && <p className="text-sm text-danger-text">{errors.price.message}</p>}
        </div>
      </div>

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
          {isSubmitting ? "Kaydediliyor" : isEdit ? "Kaydet" : "Hizmeti ekle"}
        </Button>
      </FormActions>
    </form>
  );
}
