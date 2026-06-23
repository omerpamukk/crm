"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/constants";

import { paymentSchema, NONE, type PaymentInput } from "./schema";
import { createPayment } from "./actions";

export interface CustomerOption {
  id: string;
  full_name: string;
}
export interface PackageOption {
  id: string;
  customer_id: string | null;
  service_name: string | null;
}

export function PaymentForm({
  customers,
  packages,
  onSuccess,
  onCancel,
}: {
  customers: CustomerOption[];
  packages: PackageOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_id: "",
      amount: "",
      method: "nakit",
      package_id: NONE,
      note: "",
    },
  });

  const selectedCustomer = watch("customer_id");
  const customerPackages = packages.filter(
    (p) => p.customer_id === selectedCustomer
  );

  async function onSubmit(values: PaymentInput) {
    setFormError(null);
    const result = await createPayment(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success("Ödeme kaydedildi");
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
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v);
                setValue("package_id", NONE); // müşteri değişince paket seçimini sıfırla
              }}
            >
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Tutar (₺) *</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="500"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-danger">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Yöntem</Label>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="method" className="w-full">
                  <SelectValue placeholder="Yöntem" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="package_id">Pakete bağla (opsiyonel)</Label>
        <Controller
          control={control}
          name="package_id"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={!selectedCustomer || customerPackages.length === 0}
            >
              <SelectTrigger id="package_id" className="w-full">
                <SelectValue placeholder="Paket seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Bağlama —</SelectItem>
                {customerPackages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.service_name ?? "Paket"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {selectedCustomer && customerPackages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Bu müşterinin paketi yok.
          </p>
        )}
      </div>

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
          {isSubmitting ? "Kaydediliyor..." : "Ödeme al"}
        </Button>
      </div>
    </form>
  );
}
