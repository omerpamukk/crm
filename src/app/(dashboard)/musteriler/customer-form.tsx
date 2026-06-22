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
import { CUSTOMER_STATUSES } from "@/lib/constants";
import type { Customer } from "@/types/database";

import { customerSchema, type CustomerInput } from "./schema";
import { createCustomer, updateCustomer } from "./actions";

export function CustomerForm({
  customer,
  onSuccess,
  onCancel,
}: {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(customer);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: customer?.full_name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      source: customer?.source ?? "",
      status: customer?.status ?? "new",
      tags: customer?.tags?.join(", ") ?? "",
      birthday: customer?.birthday ?? "",
      note: customer?.note ?? "",
    },
  });

  async function onSubmit(values: CustomerInput) {
    setFormError(null);
    const result = isEdit
      ? await updateCustomer(customer!.id, values)
      : await createCustomer(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Müşteri güncellendi" : "Müşteri eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Ad-soyad *</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name && (
          <p className="text-sm text-danger">{errors.full_name.message}</p>
        )}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Durum</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Kaynak</Label>
          <Input
            id="source"
            placeholder="Instagram, tavsiye, ..."
            {...register("source")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="birthday">Doğum tarihi</Label>
          <Input id="birthday" type="date" {...register("birthday")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Etiketler</Label>
          <Input
            id="tags"
            placeholder="virgülle ayırın: vip, düzenli"
            {...register("tags")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Not</Label>
        <Textarea id="note" rows={3} {...register("note")} />
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
