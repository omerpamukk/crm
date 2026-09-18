import { z } from "zod";

/** Ayarlar > Temel Bilgiler — firma kartı. */
export const businessInfoSchema = z.object({
  name: z.string().min(1, "Firma adı zorunludur"),
  sector: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Geçerli bir e-posta girin"
    ),
  address: z.string().optional(),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;

/** Ayarlar > Temel Bilgiler — işletme sahibi kartı. */
export const ownerProfileSchema = z.object({
  full_name: z.string().min(1, "Ad soyad zorunludur"),
  phone: z.string().optional(),
});

export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;

/** Tek bir günün çalışma saati. */
export const workingDaySchema = z.object({
  /** 1 = Pazartesi … 7 = Pazar */
  day: z.number().int().min(1).max(7),
  open: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Saat SS:DD biçiminde olmalı"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Saat SS:DD biçiminde olmalı"),
});

export const workingHoursSchema = z.object({
  days: z.array(workingDaySchema).length(7, "7 gün gönderilmeli"),
});

export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;
export type WorkingDay = z.infer<typeof workingDaySchema>;
