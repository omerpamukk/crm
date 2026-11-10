"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { derivePaymentStatus, paymentStatusLabel } from "@/lib/constants";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { zonedParts } from "@/lib/zaman";
import type { Package } from "@/types/database";

import { packageSchema, type PackageInput } from "./schema";
import { createPackage, updatePackage } from "./actions";

export interface CustomerOption {
  id: string;
  full_name: string;
}

const num = (v?: string) => (v ? Number(v.replace(",", ".")) : null);

function todayKey(): string {
  const p = zonedParts(Date.now());
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/**
 * Paket satışı / düzenleme formu. Ödeme durumu fiyat ve ödenen tutardan
 * kendiliğinden hesaplanır (elle seçilmez). Yeni satışta kalan seans,
 * toplam seansa eşittir; yalnızca düzenlerken değiştirilir.
 */
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
      purchased_at: pkg?.purchased_at ? toDateTimeLocal(pkg.purchased_at).slice(0, 10) : todayKey(),
      price: pkg?.price?.toString() ?? "",
      paid_amount: pkg?.paid_amount ? String(pkg.paid_amount) : "",
      payment_status: pkg?.payment_status ?? "odenmedi",
    },
  });

  const price = num(useWatch({ control, name: "price" }));
  const paid = num(useWatch({ control, name: "paid_amount" })) ?? 0;
  const status = derivePaymentStatus(price, paid);
  const debt = price != null ? Math.max(price - paid, 0) : 0;

  async function onSubmit(values: PackageInput) {
    setFormError(null);
    const payload: PackageInput = {
      ...values,
      // purchased_at zaman damgasıdır: seçilen günü işletme saatiyle öğleye sabitleyip yaz.
      purchased_at: values.purchased_at ? (fromDateTimeLocal(`${values.purchased_at}T12:00`) ?? undefined) : undefined,
      payment_status: derivePaymentStatus(num(values.price), num(values.paid_amount) ?? 0),
      // Yeni satışta kalan seans toplam seansa eşit başlar.
      remaining_sessions: isEdit ? values.remaining_sessions : values.total_sessions,
    };
    const result = isEdit ? await updatePackage(pkg!.id, payload) : await createPackage(payload);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Paket güncellendi" : "Paket satıldı");
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
        {errors.customer_id && <p className="text-sm text-danger">{errors.customer_id.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_name">Paket adı</Label>
        <Input id="service_name" placeholder="Örn. 10 seanslık paket" {...register("service_name")} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="total_sessions">Toplam seans</Label>
          <Input id="total_sessions" inputMode="numeric" placeholder="10" {...register("total_sessions")} />
          {errors.total_sessions && <p className="text-sm text-danger">{errors.total_sessions.message}</p>}
        </div>
        {isEdit ? (
          <div className="space-y-2">
            <Label htmlFor="remaining_sessions">Kalan seans</Label>
            <Input id="remaining_sessions" inputMode="numeric" placeholder="10" {...register("remaining_sessions")} />
            {errors.remaining_sessions && <p className="text-sm text-danger">{errors.remaining_sessions.message}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="purchased_at">Satış tarihi</Label>
            <Input id="purchased_at" type="date" {...register("purchased_at")} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Fiyat (₺)</Label>
          <Input id="price" inputMode="decimal" placeholder="2500" {...register("price")} />
          {errors.price && <p className="text-sm text-danger">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paid_amount">{isEdit ? "Ödenen tutar (₺)" : "Peşin ödenen (₺)"}</Label>
          <Input id="paid_amount" inputMode="decimal" placeholder="0" {...register("paid_amount")} />
          {errors.paid_amount && <p className="text-sm text-danger">{errors.paid_amount.message}</p>}
        </div>
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="purchased_at">Satış tarihi</Label>
          <Input id="purchased_at" type="date" {...register("purchased_at")} />
        </div>
      )}

      {price != null && price > 0 && (
        <p className="text-subhead text-label-2" aria-live="polite">
          Ödeme durumu: {paymentStatusLabel(status)}
          {debt > 0 ? ` · Kalan ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(debt)}` : ""}
        </p>
      )}

      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor" : isEdit ? "Kaydet" : "Paket sat"}
        </Button>
      </div>
    </form>
  );
}
