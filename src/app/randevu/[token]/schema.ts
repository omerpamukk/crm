import { z } from "zod";

/** 3. adım: müşterinin iletişim bilgileri ve açık rıza. */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Adınızı ve soyadınızı yazın"),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Telefon numaranızı alan koduyla yazın (ör. 05xx xxx xx xx)"),
  kvkk: z.boolean().refine((v) => v, "Devam etmek için onay vermeniz gerekiyor"),
});

export type ContactInput = z.infer<typeof contactSchema>;
