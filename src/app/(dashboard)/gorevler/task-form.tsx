"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormActions } from "@/components/shared/form-sheet";
import { toDateTimeLocal } from "@/lib/format";

import { createTask, updateTask } from "./actions";
import { taskSchema, type TaskInput } from "./schema";
import {
  PRIORITY_LABEL,
  TEAM_LABEL,
  type BoardColumn,
  type BoardOption,
  type BoardTask,
  type Priority,
} from "./task-utils";

// Radix Select boş değer kabul etmez; "yok" seçeneklerinin yerine geçer.
const NONE = "__yok";

const PRIORITIES = (["high", "normal", "low"] as Priority[]).map((p) => ({
  value: p,
  label: PRIORITY_LABEL[p],
}));

/** Görev ekleme ve düzenleme formu. Açıklama, öncelik ve müşteri "Gelişmiş" altında kapalı başlar. */
export function TaskForm({
  task,
  defaultColumnId,
  columns,
  staff,
  customers,
  onSuccess,
  onCancel,
  onDelete,
}: {
  task?: BoardTask;
  defaultColumnId: string;
  columns: BoardColumn[];
  staff: BoardOption[];
  customers: BoardOption[];
  onSuccess: () => void;
  onCancel: () => void;
  /** Yalnızca düzenlemede: görevi sil. */
  onDelete?: () => void;
}) {
  const isEdit = Boolean(task);
  const [formError, setFormError] = useState<string | null>(null);
  const hasMore = Boolean(task && (task.description || task.customerId || task.priority !== "normal"));

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      column_id: task?.columnId ?? defaultColumnId,
      assignee_id: task?.assigneeId ?? "",
      due_at: toDateTimeLocal(task?.dueAt ?? null),
      priority: task?.priority ?? "normal",
      customer_id: task?.customerId ?? "",
    },
  });

  async function onSubmit(values: TaskInput) {
    setFormError(null);
    const res = task ? await updateTask(task.id, values) : await createTask(values);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success(isEdit ? "Görev kaydedildi" : "Görev eklendi");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Görev *</Label>
        <Input
          id="title"
          autoFocus={!isEdit}
          placeholder="Ne yapılacak?"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-subhead text-danger-text">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="column_id">Liste</Label>
        <Controller
          control={control}
          name="column_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="column_id" className="w-full">
                <SelectValue placeholder="Liste seçin" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.column_id && <p className="text-subhead text-danger-text">{errors.column_id.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignee_id">Kime</Label>
        <Controller
          control={control}
          name="assignee_id"
          render={({ field }) => (
            <Select
              value={field.value || NONE}
              onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
            >
              <SelectTrigger id="assignee_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{TEAM_LABEL}</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_at">Ne zaman</Label>
        <Input id="due_at" type="datetime-local" aria-invalid={!!errors.due_at} {...register("due_at")} />
        {errors.due_at && <p className="text-subhead text-danger-text">{errors.due_at.message}</p>}
      </div>

      <Disclosure title="Gelişmiş" defaultOpen={hasMore} contentClassName="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea id="description" rows={3} placeholder="Ayrıntı yazabilirsiniz" {...register("description")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_id">Müşteri</Label>
          <Controller
            control={control}
            name="customer_id"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
              >
                <SelectTrigger id="customer_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Müşteri yok</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Öncelik</Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <SegmentedControl
                items={PRIORITIES}
                value={field.value}
                onValueChange={field.onChange}
                aria-label="Öncelik"
                fullWidth
                size="touch"
              />
            )}
          />
        </div>
      </Disclosure>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <FormActions
        start={
          onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Görevi sil
            </Button>
          )
        }
      >
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </FormActions>
    </form>
  );
}
