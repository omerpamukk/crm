import { z } from "zod";

import { AUDIENCE_KEYS } from "@/lib/campaigns/audience";

export const MAX_BODY = 600;

export const audienceSchema = z.enum(AUDIENCE_KEYS, { message: "Kimlere gideceğini seçin." });

export const campaignSchema = z.object({
  name: z.string().trim().max(80, "Ad en fazla 80 karakter olabilir.").optional().default(""),
  audience: audienceSchema,
  body: z
    .string()
    .trim()
    .min(10, "Mesaj en az 10 karakter olmalı.")
    .max(MAX_BODY, `Mesaj en fazla ${MAX_BODY} karakter olabilir.`),
});

export type CampaignInput = z.input<typeof campaignSchema>;
