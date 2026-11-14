import { Circle } from "lucide-react";

import { ListGroup, ListRow } from "@/components/shared/list-group";
import type { SetupStep } from "@/lib/setup/checklist";

/**
 * İlk kurulum kartı: yalnızca işletme sahibine, adımlar bitene kadar.
 * Yalnızca kalan adımlar listelenir (bitenler ekranda yer kaplamasın);
 * her satır ilgili sayfaya gider.
 */
export function SetupCard({ steps }: { steps: SetupStep[] }) {
  const pending = steps.filter((s) => !s.done);
  if (pending.length === 0) return null;
  const done = steps.length - pending.length;
  return (
    <ListGroup title="Kurulum" detail={`${done}/${steps.length} tamamlandı`} inset={52}>
      {pending.map((s, i) => (
        <ListRow
          key={s.key}
          href={s.href}
          leading={
            <Circle aria-label="Yapılacak" className={i === 0 ? "size-[22px] text-primary-text" : "size-[22px] text-label-3"} />
          }
          title={s.title}
          subtitle={s.hint}
        />
      ))}
    </ListGroup>
  );
}
