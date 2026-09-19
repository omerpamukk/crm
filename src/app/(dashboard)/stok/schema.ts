import { z } from "zod";

export const UNITS = ["adet", "ml", "gr", "kutu", "paket"] as const;

const numericText = (label: string) =>
  z
    .string()
    .optional()
    .refine((v) => !v || /^\d+([.,]\d{1,2})?$/.test(v), `Geçerli bir ${label} girin`);

export const productSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur"),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1),
  stock_qty: numericText("miktar"),
  critical_level: numericText("kritik seviye"),
  cost_price: numericText("alış fiyatı"),
  sale_price: numericText("satış fiyatı"),
  is_active: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const MOVEMENT_KINDS = ["in", "out", "adjust", "consume"] as const;

export const movementSchema = z.object({
  product_id: z.string().min(1, "Ürün seçilmeli"),
  kind: z.enum(MOVEMENT_KINDS),
  qty: z
    .string()
    .min(1, "Miktar zorunludur")
    .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), "Geçerli bir miktar girin"),
  note: z.string().optional(),
});

export type MovementInput = z.infer<typeof movementSchema>;
