"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  UserPlus,
  CalendarPlus,
  Banknote,
  Columns3,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav";

type Item = { id: string; label: string; hint?: string; icon: LucideIcon; href: string; group: string };

const QUICK_ACTIONS: Item[] = [
  { id: "qa-customer", label: "Yeni Müşteri", hint: "ekle", icon: UserPlus, href: "/musteriler?yeni=1", group: "Hızlı Aksiyon" },
  { id: "qa-appt", label: "Yeni Randevu", hint: "oluştur", icon: CalendarPlus, href: "/randevular?yeni=1", group: "Hızlı Aksiyon" },
  { id: "qa-payment", label: "Ödeme Al", hint: "tahsilat", icon: Banknote, href: "/tahsilat?yeni=1", group: "Hızlı Aksiyon" },
  { id: "qa-lead", label: "Yeni Lead", hint: "pipeline", icon: Columns3, href: "/leadler?yeni=1", group: "Hızlı Aksiyon" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  // Taze mount → her açılışta state sıfırdan başlar (effect ile reset gerekmez)
  if (!open) return null;
  return <Palette onClose={() => onOpenChange(false)} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navItems: Item[] = useMemo(
    () =>
      NAV_SECTIONS.flatMap((s) =>
        s.items.map((i) => ({ id: i.href, label: i.label, icon: i.icon, href: i.href, group: s.label }))
      ),
    []
  );

  const all = useMemo(() => [...QUICK_ACTIONS, ...navItems], [navItems]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return all;
    return all.filter((i) => i.label.toLocaleLowerCase("tr").includes(q));
  }, [all, query]);

  // Yalnızca odaklama (setState yok)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function go(item: Item) {
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  // grupları sırayla render et
  const groups = [...new Set(results.map((r) => r.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Kapat" className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-card shadow-soft-lg">
        <div className="flex items-center gap-2.5 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Sayfa ara veya komut yaz…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">ESC</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sonuç yok.</p>
          ) : (
            groups.map((g) => (
              <div key={g} className="mb-1">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
                {results
                  .map((r, gi) => ({ r, gi }))
                  .filter(({ r }) => r.group === g)
                  .map(({ r, gi }) => {
                    const Icon = r.icon;
                    const isActive = gi === active;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onMouseEnter={() => setActive(gi)}
                        onClick={() => go(r)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="flex-1">{r.label}</span>
                        {r.hint && <span className="text-xs text-muted-foreground">{r.hint}</span>}
                        {isActive && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
