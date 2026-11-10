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
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/shared/form-sheet";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { zonedParts } from "@/lib/zaman";
import type { Expense } from "@/types/database";

import { expenseSchema, type ExpenseInput } from "./schema";
import { createExpense, updateExpense } from "./actions";

/** Bugünün işletme (İstanbul) günü, YYYY-MM-DD. */
function todayKey(): string {
  const p = zonedParts(Date.now());
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Gider ekleme / düzenleme formu. Ödeme şekli ve not, "Gelişmiş" altında kapalı başlar. */
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
      amount: expense?.amount != null ? String(expense.amount) : "",
      spent_at: expense?.spent_at?.slice(0, 10) ?? todayKey(),
      method: expense?.method ?? "nakit",
      note: expense?.note ?? "",
    },
  });

  async function onSubmit(values: ExpenseInput) {
    setFormError(null);
    const result = isEdit ? await updateExpense(expense!.id, values) : await createExpense(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(isEdit ? "Gider güncellendi" : "Gider eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">Açıklama *</Label>
        <Input id="title" autoComplete="off" placeholder="Örn. Aralık kirası" {...register("title")} />
        {errors.title && <p className="text-sm text-danger-text">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Tutar (₺) *</Label>
          <Input id="amount" inputMode="decimal" placeholder="1500" {...register("amount")} />
          {errors.amount && <p className="text-sm text-danger-text">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="spent_at">Tarih *</Label>
          <Input id="spent_at" type="date" {...register("spent_at")} />
          {errors.spent_at && <p className="text-sm text-danger-text">{errors.spent_at.message}</p>}
        </div>
      </div>

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

      <Disclosure title="Gelişmiş" contentClassName="space-y-4 pt-3">
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
        <div className="space-y-2">
          <Label htmlFor="note">Not</Label>
          <Textarea id="note" rows={3} {...register("note")} />
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
          {isSubmitting ? "Kaydediliyor" : isEdit ? "Kaydet" : "Gideri ekle"}
        </Button>
      </FormActions>
    </form>
  );
}
