import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { RemindersView } from "./reminders-view";

export const metadata = { title: "Hatırlatıcılar" };

export default function HatirlaticilarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hatırlatıcılar"
        description="Randevu, ödeme ve doğum günü hatırlatmalarını otomatikleştir."
      />
      <DemoBanner>
        Hatırlatma kuralları henüz kaydedilmiyor; gönderim için SMS veya WhatsApp
        bağlantısı gerekiyor. Şu an örnek kurallar gösteriliyor.
      </DemoBanner>
      <RemindersView />
    </div>
  );
}
