import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { AdsView, type AdCampaign } from "./ads-view";

const DEMO_CAMPAIGNS: AdCampaign[] = [
  {
    id: "c1",
    name: "Yaz Cilt Bakımı Kampanyası",
    platform: "instagram",
    status: "active",
    impressions: "6.8K",
    ctr: "%4.8",
    spend: "₺1.450",
    budgetUsed: 1450,
    budgetTotal: 2000,
    daysLeft: 6,
  },
  {
    id: "c2",
    name: "Lazer Epilasyon Tanıtımı",
    platform: "facebook",
    status: "active",
    impressions: "3.9K",
    ctr: "%3.6",
    spend: "₺1.180",
    budgetUsed: 1180,
    budgetTotal: 1500,
    daysLeft: 11,
  },
  {
    id: "c3",
    name: "Kalıcı Makyaj Sonbahar",
    platform: "instagram",
    status: "paused",
    impressions: "1.7K",
    ctr: "%2.9",
    spend: "₺570",
    budgetUsed: 570,
    budgetTotal: 1000,
  },
];

export default function ReklamlarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklamlar"
        description="Meta ve Google reklamlarını tek panelden yönet."
      />
      <DemoBanner>
        Meta (Instagram/Facebook) ve Google Ads hesabın bağlandığında gerçek
        kampanya performansı görünecek. Şu an örnek kampanyalar gösteriliyor.
      </DemoBanner>
      <AdsView initialCampaigns={DEMO_CAMPAIGNS} />
    </div>
  );
}
