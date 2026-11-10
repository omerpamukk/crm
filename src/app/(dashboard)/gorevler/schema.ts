import { z } from "zod";

export const PRIORITIES = ["high", "normal", "low"] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Görev başlığı zorunludur"),
  description: z.string().optional(),
  column_id: z.string().min(1, "Liste seçilmeli"),
  /** Boş string = "Tüm ekip" */
  assignee_id: z.string().optional(),
  /** datetime-local değeri ("2026-09-19T17:00", İstanbul saati) veya boş */
  due_at: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Geçerli bir tarih ve saat girin"),
  priority: z.enum(PRIORITIES),
  customer_id: z.string().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const columnSchema = z.object({
  label: z.string().trim().min(1, "Liste adı zorunludur"),
  color: z.string().optional(),
  is_done: z.boolean().optional(),
});

export type ColumnInput = z.infer<typeof columnSchema>;
