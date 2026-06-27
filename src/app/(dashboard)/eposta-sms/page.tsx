import { Mail } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function EpostaSmsPage() {
  return (
    <ComingSoon
      title="E-posta & SMS"
      pageDescription="Toplu e-posta ve SMS kampanyaları."
      icon={Mail}
      tagline="Kampanya & Toplu Gönderim"
      description="Hedef kitleye toplu e-posta ve SMS gönder; açılma/tıklanma performansını izle."
      features={[
        "E-posta ve SMS kampanya yönetimi",
        "Hedef kitle segmentasyonu",
        "Açılma, tıklanma ve teslim raporları",
        "Otomatik tetiklenen seriler",
      ]}
    />
  );
}
