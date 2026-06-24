import { PageHeader } from "@/components/shared/page-header";

import { WriterView } from "./writer-view";

export default function MetinYaziciPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metin Yazıcı"
        description="AI ile saniyeler içinde Instagram, WhatsApp, e-posta, SMS ve reklam metinleri üret."
      />
      <WriterView />
    </div>
  );
}
