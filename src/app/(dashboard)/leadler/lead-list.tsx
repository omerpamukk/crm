"use client";

import { Users } from "lucide-react";

import type { Customer, PipelineStage } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";

import { stageIdOf } from "./lead-types";

const ALL = "hepsi";

/**
 * Lead listesi: üstte aşama seçici, altında o aşamadaki lead'ler.
 * Telefonda pano yerine bu görünüm kullanılır; masaüstünde "Liste" görünümüdür.
 */
export function LeadList({
  stages,
  leads,
  stageFilter,
  onStageFilter,
  onOpen,
  searching,
}: {
  stages: PipelineStage[];
  leads: Customer[];
  stageFilter: string;
  onStageFilter: (v: string) => void;
  onOpen: (lead: Customer) => void;
  searching: boolean;
}) {
  const stageName = (l: Customer) =>
    stages.find((s) => s.id === stageIdOf(l, stages))?.name ?? "";
  const valid = stageFilter === ALL || stages.some((s) => s.id === stageFilter);
  const current = valid ? stageFilter : ALL;
  const shown =
    current === ALL ? leads : leads.filter((l) => stageIdOf(l, stages) === current);

  const items = [
    { value: ALL, label: "Tümü", count: leads.length },
    ...stages.map((s) => ({
      value: s.id,
      label: s.name,
      count: leads.filter((l) => stageIdOf(l, stages) === s.id).length,
    })),
  ];

  return (
    <div className="min-w-0 space-y-4">
      <SegmentedControl
        items={items}
        value={current}
        onValueChange={onStageFilter}
        aria-label="Aşama"
        size="touch"
        className="w-full md:w-auto"
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searching ? "Aramaya uyan lead yok" : "Bu aşamada lead yok"}
          description={
            searching
              ? "Aramayı değiştirin ya da temizleyin."
              : "Başka bir aşamaya bakın ya da yeni lead ekleyin."
          }
        />
      ) : (
        <ListGroup aria-label="Lead'ler" inset={64}>
          {shown.map((lead) => (
            <ListRow
              key={lead.id}
              leading={<Avatar name={lead.full_name} />}
              title={lead.full_name}
              subtitle={[lead.phone, lead.source].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
              trailing={
                current === ALL ? (
                  <span className="max-w-[7rem] truncate text-subhead text-label-2">
                    {stageName(lead)}
                  </span>
                ) : undefined
              }
              chevron
              onClick={() => onOpen(lead)}
            />
          ))}
        </ListGroup>
      )}
    </div>
  );
}
