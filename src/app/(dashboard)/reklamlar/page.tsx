import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { AdsView, type AdCampaign } from "./ads-view";

// NOT: Reklam verileri Meta (Instagram/Facebook) & Google Ads entegrasyonu
// gerektirir. Entegrasyon bağlanana kadar DEMO veriyle gösterilir.
const DEMO_CAMPAIGNS: AdCampaign[] = [
  {
    id: "c1",
    name: "Güzellik & Bakım Lead Kampanyası",
    platform: "instagram",
    status: "active",
    impressions: "8.2K",
    ctr: "%4.8",
    spend: "₺2.100",
    budgetUsed: 3200,
    budgetTotal: 5000,
    daysLeft: 12,
  },
  {
    id: "c2",
    name: "Sezon Sonu İndirim",
    platform: "facebook",
    status: "paused",
    impressions: "4.2K",
    ctr: "%3.1",
    spend: "₺1.100",
    budgetUsed: 1100,
    budgetTotal: 3000,
  },
];

export default function ReklamlarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklamlar"
        description="AI destekli reklam kampanyalarını tek ekrandan yönet, optimize et."
      >
        <Button variant="outline" disabled>
          <Plus className="size-4" />
          Yeni
        </Button>
      </PageHeader>

      <AdsView initialCampaigns={DEMO_CAMPAIGNS} />
    </div>
  );
}
