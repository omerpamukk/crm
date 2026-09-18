import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { CampaignsView } from "./campaigns-view";

export default function EpostaSmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="E-posta & SMS"
        description="Toplu kampanya gönder, açılma ve teslim oranlarını izle."
      />
      <DemoBanner>
        Gönderim için SMTP veya SMS sağlayıcı (Netgsm, İleti Merkezi) bağlantısı
        gerekiyor. Şu an örnek kampanya verisi gösteriliyor.
      </DemoBanner>
      <CampaignsView />
    </div>
  );
}
