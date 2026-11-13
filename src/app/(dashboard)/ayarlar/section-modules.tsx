"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { MODULES, MODULE_KEYS, isModuleEnabled } from "@/lib/modules";

import { updateModules } from "./actions";

/**
 * Modüller: işletmenin işine göre açılan bölümler. Kapalı modül menüden
 * kalkar; verisi silinmez, yeniden açınca olduğu gibi döner.
 */
export function ModulesSection({ modules, ready }: { modules: string[] | null; ready: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState<string[]>(() => MODULE_KEYS.filter((k) => isModuleEnabled(modules, k)));

  function toggle(key: string, next: boolean) {
    const prev = on;
    const value = next ? [...on, key] : on.filter((k) => k !== key);
    setOn(value);
    start(async () => {
      const res = await updateModules(value);
      if (res.error) {
        setOn(prev);
        toast.error(res.error);
        return;
      }
      const label = MODULES.find((m) => m.key === key)?.label ?? "Modül";
      toast.success(next ? `${label} açıldı` : `${label} kapatıldı`);
      router.refresh();
    });
  }

  if (!ready) {
    return (
      <p className="surface p-4 text-[0.9375rem] text-label-2">
        Modül ayarları henüz hazır değil. Sistem güncellemesi tamamlanınca burada görünecek.
      </p>
    );
  }

  return (
    <ListGroup
      title="Açık modüller"
      detail="Kullanmadığınız bölümleri kapatın; menü sadeleşir. Kapatınca verileriniz silinmez."
    >
      {MODULES.map((m) => {
        const checked = on.includes(m.key);
        return (
          <ListRow
            key={m.key}
            title={m.label}
            subtitle={m.hint}
            trailing={
              <Switch
                checked={checked}
                disabled={pending}
                onCheckedChange={(v) => toggle(m.key, v)}
                label={`${m.label} ${checked ? "açık" : "kapalı"}`}
              />
            }
          />
        );
      })}
    </ListGroup>
  );
}
