import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { MessagesView } from "./messages-view";
import { DEMO_CONVERSATIONS, type Channel } from "./demo-data";

export const metadata = { title: "Mesajlar" };

const CHANNELS: Channel[] = ["instagram", "whatsapp", "messenger", "tiktok", "email"];

export default async function MesajlarPage({
  searchParams,
}: {
  searchParams: Promise<{ kanal?: string }>;
}) {
  const { kanal } = await searchParams;
  const initialChannel =
    kanal && (CHANNELS as string[]).includes(kanal) ? (kanal as Channel) : "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tüm Mesajlar"
        description="Instagram, WhatsApp, Messenger ve TikTok mesajları tek gelen kutusunda."
      />
      <DemoBanner>
        Kanallar bağlandığında gerçek yazışmalar buraya düşecek. Şu an örnek
        sohbetlerle çalışıyor; gönderilen mesajlar kaydedilmez.
      </DemoBanner>
      <MessagesView conversations={DEMO_CONVERSATIONS} initialChannel={initialChannel} />
    </div>
  );
}
