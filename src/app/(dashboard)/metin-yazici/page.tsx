import { PageHeader } from "@/components/shared/page-header";
import { WriterView } from "./writer-view";

export const metadata = { title: "Metin Yazıcı" };

export default function MetinYaziciPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metin Yazıcı"
        description="Instagram, WhatsApp, SMS ve e-posta metinlerini yapay zeka ile üret."
      />
      <WriterView />
    </div>
  );
}
