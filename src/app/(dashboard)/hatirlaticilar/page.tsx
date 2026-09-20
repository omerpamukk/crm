import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/supabase/business";
import { PageHeader } from "@/components/shared/page-header";

import { AutomationsView, type Automation } from "./automations-view";

export const metadata = { title: "Otomatik Hatırlatmalar" };

/**
 * Otomatik Hatırlatmalar — eski "Otomasyonlar" ve "Hatırlatıcılar"
 * sayfalarının birleşimi. Kurallar `automations` tablosunda tutulur
 * (0025_automations.sql); cron bunları okuyup `reminders` üretir.
 */
export default async function HatirlaticilarPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId(supabase);

  const { data, error } = await supabase
    .from("automations")
    .select(
      "id, title, active, trigger_id, trigger_param, action_id, action_param, message"
    )
    .eq("business_id", businessId ?? "")
    .order("created_at", { ascending: true });

  if (error) console.error("automations:", error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Otomatik Hatırlatmalar"
        description="Randevu, ödeme ve doğum günü mesajlarını otomatikleştir — kural bir kez kurulur, sonrası kendiliğinden işler."
      />

      <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Mesajların gerçekten gönderilebilmesi için{" "}
          <b className="font-medium text-foreground">Ayarlar → Entegrasyonlar</b>{" "}
          ekranından SMS, e-posta veya WhatsApp bağlantısı kurulmuş olmalı.
          Kurallar her gün sabah çalıştırılır.
        </p>
      </div>

      <AutomationsView items={(data ?? []) as Automation[]} />
    </div>
  );
}
