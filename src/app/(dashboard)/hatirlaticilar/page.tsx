import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

import { RemindersView } from "./reminders-view";

export default function HatirlaticilarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hatırlatıcılar"
        description="Randevu, değerlendirme ve geri kazanım hatırlatmalarını WhatsApp & SMS ile otomatikleştir."
      >
        <Button disabled>
          <Plus className="size-4" />
          Yeni Kural
        </Button>
      </PageHeader>
      <RemindersView />
    </div>
  );
}
