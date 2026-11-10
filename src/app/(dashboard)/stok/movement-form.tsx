"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/shared/form-sheet";

import { addMovement } from "./actions";
import { movementSchema, type MovementInput } from "./schema";

/** Stok girişi / çıkışı formu: miktar ve isteğe bağlı not. */
export function MovementForm({
  productId,
  kind,
  unit,
  onSuccess,
  onCancel,
}: {
  productId: string;
  kind: "in" | "out";
  unit: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MovementInput>({
    resolver: zodResolver(movementSchema),
    defaultValues: { product_id: productId, kind, qty: "", note: "" },
  });

  async function onSubmit(values: MovementInput) {
    setFormError(null);
    const result = await addMovement(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(kind === "in" ? "Stok girişi kaydedildi" : "Stok çıkışı kaydedildi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="m-qty">Miktar ({unit}) *</Label>
        <Input id="m-qty" inputMode="decimal" autoComplete="off" placeholder="0" {...register("qty")} />
        {errors.qty && <p className="text-sm text-danger-text">{errors.qty.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="m-note">Not</Label>
        <Input id="m-note" autoComplete="off" placeholder="İsteğe bağlı" {...register("note")} />
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
          {isSubmitting ? "Kaydediliyor" : kind === "in" ? "Stok girişi yap" : "Stok çıkışı yap"}
        </Button>
      </FormActions>
    </form>
  );
}
