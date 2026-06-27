import { MessageSquare } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function MesajlarPage() {
  return (
    <ComingSoon
      title="Tüm Mesajlar"
      pageDescription="Instagram, WhatsApp, Messenger ve TikTok mesajları tek gelen kutusunda."
      icon={MessageSquare}
      tagline="Omnichannel Gelen Kutusu"
      description="Tüm sosyal ve mesajlaşma kanallarındaki yazışmaları tek ekrandan yönet, müşteriye dönüştür."
      features={[
        "Instagram DM, WhatsApp, Messenger ve TikTok tek kutuda",
        "Kanal bazlı filtre ve okunmamış sayaçları",
        "Sohbetten tek tıkla potansiyel müşteriye ekleme",
        "Hazır yanıt şablonları ve ekibe atama",
      ]}
    />
  );
}
