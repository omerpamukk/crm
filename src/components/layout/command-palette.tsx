"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  CornerDownLeft,
  UserPlus,
  CalendarPlus,
  Banknote,
  Columns3,
  User,
  type LucideIcon,
} from "lucide-react";

import { NAV_SECTIONS } from "@/lib/nav";
import { searchCustomers, type CustomerHit } from "./search-actions";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  group: string;
};

const QUICK_ACTIONS: Item[] = [
  { id: "qa-customer", label: "Yeni Müşteri", hint: "ekle", icon: UserPlus, href: "/musteriler?yeni=1", group: "Hızlı Aksiyon" },
  { id: "qa-appt", label: "Yeni Randevu", hint: "oluştur", icon: CalendarPlus, href: "/randevular?yeni=1", group: "Hızlı Aksiyon" },
  { id: "qa-payment", label: "Ödeme Al", hint: "tahsilat", icon: Banknote, href: "/tahsilat?yeni=1", group: "Hızlı Aksiyon" },
  { id: "qa-lead", label: "Yeni Lead", hint: "pipeline", icon: Columns3, href: "/leadler?yeni=1", group: "Hızlı Aksiyon" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <AnimatePresence>
      {open && <Palette onClose={() => onOpenChange(false)} />}
    </AnimatePresence>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  const navItems: Item[] = useMemo(
    () =>
      NAV_SECTIONS.flatMap((s) =>
        s.items.map((i) => ({
          id: i.href,
          label: i.label,
          icon: i.icon,
          href: i.href,
          group: s.label,
        }))
      ),
    []
  );

  // ESC ile kapat + palet açıkken arka planın kaymasını engelle.
  // Ayrıca basit bir focus tuzağı: Tab arka plandaki sayfaya kaçmasın
  // ve palet kapanınca odak tetikleyen öğeye geri dönsün.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  // Müşteri araması (debounce) — sunucu tarafı arama
  useEffect(() => {
    const q = query.trim();
    const t = window.setTimeout(() => {
      if (q.length < 2) setHits([]);
      else searchCustomers(q).then(setHits).catch(() => setHits([]));
    }, 180);
    return () => window.clearTimeout(t);
  }, [query]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    const customerItems: Item[] = hits.map((h) => ({
      id: `c-${h.id}`,
      label: h.full_name,
      hint: h.phone ?? (h.is_lead ? "lead" : "müşteri"),
      icon: User,
      href: `/musteriler/${h.id}`,
      group: "Müşteriler",
    }));
    for (const item of [...customerItems, ...QUICK_ACTIONS, ...navItems]) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [hits, navItems]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Komut paleti"
    >
      <motion.button
        type="button"
        aria-label="Kapat"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -4 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        ref={dialogRef}
        className="relative w-full max-w-xl overflow-hidden rounded-lg border bg-popover shadow-soft-lg"
      >
        <Command
          loop
          // Kendi arama/filtrelememizi cmdk'nın puanlamasıyla birleştir:
          // müşteri sonuçları sunucudan geldiği için onları hep göster.
          filter={(value, search) => {
            if (!search) return 1;
            if (value.startsWith("c-")) return 1;
            return value.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"))
              ? 1
              : 0;
          }}
        >
          <div className="flex items-center gap-2.5 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Sayfa ara, müşteri bul veya komut yaz…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[55vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              Sonuç yok.
            </Command.Empty>

            {groups.map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.id}
                      value={`${item.id} ${item.label}`}
                      onSelect={() => go(item.href)}
                      className="group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors data-[selected=true]:bg-accent"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground group-data-[selected=true]:text-primary" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="text-xs text-muted-foreground">{item.hint}</span>
                      )}
                      <CornerDownLeft className="size-3.5 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </motion.div>
    </div>
  );
}
