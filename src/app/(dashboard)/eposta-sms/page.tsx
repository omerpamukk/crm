import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

import { CampaignsView } from "./campaigns-view";

export default function EpostaSmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="E-posta & SMS"
        description="Toplu e-posta ve SMS kampanyalarını yönet, performansını takip et."
      >
        <Button disabled>
          <Plus className="size-4" />
          Yeni Kampanya
        </Button>
      </PageHeader>
      <CampaignsView />
    </div>
  );
}
