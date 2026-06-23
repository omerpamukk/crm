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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import type { Expense } from "@/types/database";

import { expenseSchema, type ExpenseInput } from "./schema";
import { createExpense, updateExpense } from "./actions";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function ExpenseForm({
  expense,
  onSuccess,
  onCancel,
}: {
  expense?: Expense;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(expense);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: expense?.title ?? "",
      category: expense?.category ?? "diger",
      amount: expense?.amount?.toString() ?? "",
      spent_at: expense?.spent_at ?? todayStr(),
      method: expense?.method ?? "nakit",
      note: expense?.note ?? "",
    },
  });

  async function onSubmit(values: ExpenseInput) {
    setFormError(null);
    const result = isEdit
      ? await updateExpense(expense!.id, values)
      : await createExpense(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(isEdit ? "Gider güncellendi" : "Gider eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Açıklama *</Label>
        <Input
          id="title"
          placeholder="Örn. Mayıs ayı kirası"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-danger">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Kategori *</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Tutar (₺) *</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="1500"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-danger">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="spent_at">Tarih *</Label>
          <Input id="spent_at" type="date" {...register("spent_at")} />
          {errors.spent_at && (
            <p className="text-sm text-danger">{errors.spent_at.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Ödeme şekli</Label>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="method" className="w-full">
                  <SelectValue placeholder="Ödeme şekli" />
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
