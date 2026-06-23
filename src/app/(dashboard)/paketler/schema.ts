import { z } from "zod";

const intField = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+$/.test(v), "Tam sayı girin");

export const packageSchema = z.object({
  customer_id: z.string().min(1, "Müşteri seçin"),
  service_name: z.string().optional(),
  total_sessions: intField,
  remaining_sessions: intField,
  purchased_at: z.string().optional(), // yyyy-mm-dd
  price: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+([.,]\d{1,2})?$/.test(v),
      "Geçerli bir fiyat girin"
    ),
  paid_amount: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+([.,]\d{1,2})?$/.test(v),
      "Geçerli bir tutar girin"
    ),
  payment_status: z.string().optional(),
});

export type PackageInput = z.infer<typeof packageSchema>;
