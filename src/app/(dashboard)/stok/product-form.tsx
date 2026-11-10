"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormActions } from "@/components/shared/form-sheet";

import { createProduct, updateProduct } from "./actions";
import { productSchema, UNITS, type ProductInput } from "./schema";

export type ProductSeed = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  critical_level: number;
  cost_price: number | null;
  sale_price: number | null;
  is_active: boolean;
};

const numText = (n: number | null | undefined) => (n != null && n !== 0 ? String(n) : "");

/**
 * Ürün ekleme / düzenleme formu. Stok miktarı düzenlemede değişmez: giriş ve
 * çıkış hareketleriyle değişir. Kod, kategori ve fiyatlar "Gelişmiş" altında.
 */
export function ProductForm({
  product,
  categories,
  onSuccess,
  onCancel,
}: {
  product?: ProductSeed;
  categories: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(product);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      category: product?.category ?? "",
      unit: product?.unit ?? "adet",
      stock_qty: "",
      critical_level: numText(product?.critical_level),
      cost_price: numText(product?.cost_price),
      sale_price: numText(product?.sale_price),
      is_active: product?.is_active ?? true,
    },
  });

  async function onSubmit(values: ProductInput) {
    setFormError(null);
    const result = isEdit ? await updateProduct(product!.id, values) : await createProduct(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEdit ? "Ürün güncellendi" : "Ürün eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="p-name">Ürün adı *</Label>
        <Input id="p-name" autoComplete="off" placeholder="Örn. Bakım kremi" {...register("name")} />
        {errors.name && <p className="text-sm text-danger-text">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-unit">Birim</Label>
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="p-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-crit">Kritik seviye</Label>
          <Input id="p-crit" inputMode="decimal" placeholder="3" {...register("critical_level")} />
          {errors.critical_level && <p className="text-sm text-danger-text">{errors.critical_level.message}</p>}
        </div>
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="p-qty">Açılış stoğu</Label>
          <Input id="p-qty" inputMode="decimal" placeholder="0" {...register("stock_qty")} />
          {errors.stock_qty && <p className="text-sm text-danger-text">{errors.stock_qty.message}</p>}
        </div>
      )}

      <Disclosure title="Gelişmiş" contentClassName="space-y-4 pt-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p-sku">Kod</Label>
            <Input id="p-sku" autoComplete="off" placeholder="Örn. BK-001" {...register("sku")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-cat">Kategori</Label>
            <Input id="p-cat" list="product-categories" autoComplete="off" placeholder="Örn. Bakım" {...register("category")} />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p-cost">Alış fiyatı (₺)</Label>
            <Input id="p-cost" inputMode="decimal" placeholder="0" {...register("cost_price")} />
            {errors.cost_price && <p className="text-sm text-danger-text">{errors.cost_price.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-sale">Satış fiyatı (₺)</Label>
            <Input id="p-sale" inputMode="decimal" placeholder="0" {...register("sale_price")} />
            {errors.sale_price && <p className="text-sm text-danger-text">{errors.sale_price.message}</p>}
          </div>
        </div>
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
          {isSubmitting ? "Kaydediliyor" : isEdit ? "Kaydet" : "Ürünü ekle"}
        </Button>
      </FormActions>
    </form>
  );
}
