import { MapPin } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function YorumlarPage() {
  return (
    <ComingSoon
      title="Google Maps & Yorumlar"
      pageDescription="Google İşletme profilini ve yorumları yönet."
      icon={MapPin}
      tagline="Google İşletme Yönetimi"
      description="Google İşletme profilini bağla; yorumları yanıtla, puanını yükselt ve harita performansını izle."
      features={[
        "Google İşletme Profili bağlantısı",
        "Yorumları tek ekrandan yanıtlama",
        "Ortalama puan ve görüntülenme istatistikleri",
        "Hizmet sonrası otomatik yorum isteği",
      ]}
    />
  );
}
