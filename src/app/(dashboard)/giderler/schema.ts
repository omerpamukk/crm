import { z } from "zod";

import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";

const CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value) as [
  string,
  ...string[],
];
const METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [
  string,
  ...string[],
];

export const expenseSchema = z.object({
  title: z.string().min(1, "Açıklama zorunludur"),
  category: z.enum(CATEGORY_VALUES),
  amount: z
    .string()
    .min(1, "Tutar zorunludur")
    .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), "Geçerli bir tutar girin"),
  spent_at: z.string().min(1, "Tarih zorunludur"),
  method: z.enum(METHOD_VALUES),
  note: z.string().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
