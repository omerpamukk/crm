import { Megaphone } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function ReklamlarPage() {
  return (
    <ComingSoon
      title="Reklamlar"
      pageDescription="Meta ve Google reklamlarını tek panelden yönet."
      icon={Megaphone}
      tagline="AI Destekli Reklam Yönetimi"
      description="Instagram/Facebook ve Google kampanyalarını bağla; yapay zeka hedef kitle, metin ve bütçeyi optimize etsin."
      features={[
        "Meta (Instagram/Facebook) ve Google Ads bağlantısı",
        "Tek ekranda kampanya performansı (gösterim, CTR, harcama)",
        "AI optimizasyon önerileri",
        "Kampanyadan gelen lead'ler otomatik CRM'e düşer",
      ]}
    />
  );
}
