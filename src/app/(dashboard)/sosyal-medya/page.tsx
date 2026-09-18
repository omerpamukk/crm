import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { PlannerView } from "./planner-view";

export default function SosyalMedyaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sosyal Medya Planlamaları"
        description="Instagram, WhatsApp, e-posta ve SMS içeriklerini tek takvimden planla."
      />
      <DemoBanner>
        Instagram ve Facebook hesabın bağlandığında planlanan içerikler gerçekten
        yayınlanacak. Şu an örnek içeriklerle çalışıyor.
      </DemoBanner>
      <PlannerView />
    </div>
  );
}
