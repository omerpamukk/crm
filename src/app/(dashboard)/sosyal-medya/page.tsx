import { CalendarClock } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function SosyalMedyaPage() {
  return (
    <ComingSoon
      title="Sosyal Medya Planlamaları"
      pageDescription="İçeriklerini takvimle planla ve yayınla."
      icon={CalendarClock}
      tagline="İçerik Takvimi & Otomatik Paylaşım"
      description="Instagram, WhatsApp, e-posta ve SMS içeriklerini önceden planla; doğru zamanda otomatik yayınlansın."
      features={[
        "Sürükle-bırak içerik takvimi",
        "Çok kanallı planlama (Instagram, WhatsApp, e-posta, SMS)",
        "Zamanlanmış otomatik paylaşım",
        "Bekleyen/yayınlanan içerik takibi",
      ]}
    />
  );
}
