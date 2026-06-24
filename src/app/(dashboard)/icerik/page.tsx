import { PageHeader } from "@/components/shared/page-header";

import { ContentPlanner } from "./content-planner";

export default function IcerikPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="İçerik Planlayıcı"
        description="Sosyal medya içeriklerini planla ve AI metin yazıcı ile saniyeler içinde metin üret."
      />
      <ContentPlanner />
    </div>
  );
}
