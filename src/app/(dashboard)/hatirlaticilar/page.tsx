import { Bell } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function HatirlaticilarPage() {
  return (
    <ComingSoon
      title="Hatırlatıcılar"
      pageDescription="Otomatik WhatsApp ve SMS hatırlatmaları."
      icon={Bell}
      tagline="Otomatik Randevu Hatırlatmaları"
      description="Randevu, doğum günü ve geri kazanım hatırlatmalarını WhatsApp/SMS ile otomatik gönder."
      features={[
        "Randevudan önce otomatik WhatsApp/SMS",
        "Değerlendirme ve geri kazanım hatırlatmaları",
        "Etiket tabanlı tetikleyiciler",
        "Gönderim raporları",
      ]}
    />
  );
}
