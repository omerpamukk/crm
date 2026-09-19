import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

import { AutomationsView } from "./automations-view";

export const metadata = { title: "Otomasyonlar" };

export default function OtomasyonlarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Otomasyonlar"
        description="Tetik → aksiyon kuralları kur; lead, DM ve yorumları otomatik yönet."
      >
        <Button disabled>
          <Plus className="size-4" />
          Otomasyon Ekle
        </Button>
      </PageHeader>
      <AutomationsView />
    </div>
  );
}
