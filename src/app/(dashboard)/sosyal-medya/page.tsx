import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

import { PlannerView } from "./planner-view";

export default function SosyalMedyaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sosyal Medya Planlamaları"
        description="Instagram, WhatsApp, e-posta ve SMS içeriklerini takvimle planla ve takip et."
      >
        <Button disabled>
          <Plus className="size-4" />
          İçerik Ekle
        </Button>
      </PageHeader>
      <PlannerView />
    </div>
  );
}
