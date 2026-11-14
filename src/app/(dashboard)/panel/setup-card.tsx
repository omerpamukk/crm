import { CircleCheck, Circle } from "lucide-react";

import { ListGroup, ListRow } from "@/components/shared/list-group";
import type { SetupStep } from "@/lib/setup/checklist";

/**
 * İlk kurulum kartı: yalnızca işletme sahibine, adımlar bitene kadar.
 * Her satır ilgili sayfaya gider; biten adım tikli ve soluk görünür.
 */
export function SetupCard({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <ListGroup title="Kurulum" detail={`${done}/${steps.length} tamamlandı`} inset={52}>
      {steps.map((s) => (
        <ListRow
          key={s.key}
          href={s.href}
          leading={
            s.done ? (
              <CircleCheck aria-label="Tamamlandı" className="size-[22px] text-positive-text" />
            ) : (
              <Circle aria-label="Yapılacak" className={s.key === next?.key ? "size-[22px] text-primary-text" : "size-[22px] text-label-3"} />
            )
          }
          title={<span className={s.done ? "text-label-2" : undefined}>{s.title}</span>}
          subtitle={s.done ? "Tamam" : s.hint}
        />
      ))}
    </ListGroup>
  );
}
