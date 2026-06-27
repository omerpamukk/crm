import { PenLine } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function MetinYaziciPage() {
  return (
    <ComingSoon
      title="Metin Yazıcı"
      pageDescription="AI ile pazarlama metinleri üret."
      icon={PenLine}
      tagline="AI Metin Asistanı"
      description="Instagram caption, WhatsApp/SMS kampanyası, e-posta bülteni ve reklam metinlerini saniyeler içinde üret."
      features={[
        "Platforma özel hazır metin türleri",
        "Ton ve uzunluk ayarı",
        "Hashtag ve başlık önerileri",
        "Tek tıkla içerik planına aktarma",
      ]}
    />
  );
}
