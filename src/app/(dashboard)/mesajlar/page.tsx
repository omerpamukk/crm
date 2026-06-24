import { DEMO_CONVERSATIONS, type Channel } from "./demo-data";
import { MessagesView } from "./messages-view";

const CHANNELS: Channel[] = ["instagram", "whatsapp", "messenger", "tiktok", "email"];

export default async function MesajlarPage({
  searchParams,
}: {
  searchParams: Promise<{ kanal?: string }>;
}) {
  const { kanal } = await searchParams;
  const initialChannel =
    kanal && CHANNELS.includes(kanal as Channel) ? (kanal as Channel) : "all";

  return (
    <MessagesView conversations={DEMO_CONVERSATIONS} initialChannel={initialChannel} />
  );
}
