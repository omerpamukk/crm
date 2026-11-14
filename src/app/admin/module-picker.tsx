"use client";

import { Switch } from "@/components/ui/switch";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { MODULES } from "@/lib/modules";

/**
 * Firmanın açık modülleri (ajans tarafı). Çekirdek sayfalar her zaman açık
 * olduğu için listede yer almaz.
 */
export function ModulePicker({
  value,
  onChange,
  disabled,
  detail = "Firma yalnızca açık olanları menüsünde görür. Sonradan değiştirilebilir.",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  detail?: string;
}) {
  return (
    <ListGroup title="Modüller" detail={detail}>
      {MODULES.map((m) => {
        const checked = value.includes(m.key);
        return (
          <ListRow
            key={m.key}
            title={m.label}
            subtitle={m.hint}
            trailing={
              <Switch
                checked={checked}
                disabled={disabled}
                onCheckedChange={(on) => onChange(on ? [...value, m.key] : value.filter((k) => k !== m.key))}
                label={`${m.label} ${checked ? "açık" : "kapalı"}`}
              />
            }
          />
        );
      })}
    </ListGroup>
  );
}
