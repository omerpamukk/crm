import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Hizmet adı zorunludur"),
  category: z.string().optional(),
  duration_min: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Süre tam sayı (dakika) olmalı"),
  price: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+([.,]\d{1,2})?$/.test(v),
      "Geçerli bir fiyat girin"
    ),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
