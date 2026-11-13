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

import { NAV_SECTIONS, navSectionsForRole } from "@/lib/nav";
import { can } from "@/lib/permissions";
import type { UserRole } from "@/types/database";
import { spring } from "@/lib/motion";
import { searchCustomers, type CustomerHit } from "./search-actions";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  group: string;
};

// Adlar sayfalardaki düğmelerle aynı ("Tek şey, tek ad").
const QUICK_ACTIONS: Item[] = [
  { id: "qa-appt", label: "Yeni randevu", icon: CalendarPlus, href: "/randevular?yeni=1", group: "Hızlı işlem" },
  { id: "qa-customer", label: "Yeni müşteri", icon: UserPlus, href: "/musteriler?yeni=1", group: "Hızlı işlem" },
  { id: "qa-payment", label: "Ödeme al", icon: Banknote, href: "/tahsilat?yeni=1", group: "Hızlı işlem" },
  { id: "qa-lead", label: "Yeni lead", icon: Columns3, href: "/leadler?yeni=1", group: "Hızlı işlem" },
];

/**
 * Genel arama ve komut paleti (⌘K / Ctrl+K; telefonda sekme çubuğundaki
 * arama düğmesi). Müşteri arar, sayfaya gider, hızlı işlem başlatır.
 * Rolün göremediği sayfa ve işlem listede çıkmaz.
 */
export function CommandPalette({
  open,
  onOpenChange,
  role,
  modules = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role?: UserRole;
  modules?: string[] | null;
}) {
  return (
    <AnimatePresence>
      {open && <Palette onClose={() => onOpenChange(false)} role={role} modules={modules} />}
    </AnimatePresence>
  );
}

function Palette({ onClose, role, modules }: { onClose: () => void; role?: UserRole; modules: string[] | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  const navItems: Item[] = useMemo(
    () =>
      (role ? navSectionsForRole(role, modules) : NAV_SECTIONS).flatMap((s) =>
        s.items.map((i) => ({
          id: i.href,
          label: i.label,
          icon: i.icon,
          href: i.href,
          group: "Sayfalar",
        }))
      ),
    [role, modules]
  );
  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.filter((a) => {
        if (!role) return true;
        if (a.id === "qa-payment") return can(role, "tahsilat");
        if (a.id === "qa-appt") return can(role, "randevu_yonet");
        if (a.id === "qa-customer") return can(role, "musteri_ekle");
        return can(role, "musteri_yonet");
      }),
    [role]
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
    // Kaydırmayı kilitle; kaydırma çubuğunun boşluğunu koru (sayfa sağa kaymasın)
    const prev = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      document.body.style.paddingRight = prevPad;
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
    for (const item of [...customerItems, ...quickActions, ...navItems]) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [hits, navItems, quickActions]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-2 pt-[max(8px,env(safe-area-inset-top))] md:p-4 md:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Ara"
    >
      <motion.button
        type="button"
        aria-label="Kapat"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={spring.default}
        ref={dialogRef}
        className="glass-strong relative w-full max-w-xl overflow-hidden rounded-[22px]"
      >
        <Command
          loop
          label="Ara"
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
          <div className="flex items-center gap-2.5 border-b border-separator px-4">
            <Search aria-hidden className="size-[18px] shrink-0 text-label-2" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Müşteri, sayfa ya da işlem ara"
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-label outline-none placeholder:text-label-3 md:h-[52px] md:text-[0.9375rem]"
            />
            <kbd className="hidden rounded-md bg-fill px-1.5 py-0.5 text-[0.6875rem] font-semibold text-label-2 md:inline">
              esc
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 h-9 shrink-0 rounded-full px-3 text-[0.9375rem] font-semibold text-primary-text hover:bg-hover md:hidden"
            >
              Vazgeç
            </button>
          </div>

          <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-1.5">
            <Command.Empty className="px-3 py-8 text-center text-[0.875rem] text-label-2">
              {query.trim().length >= 2
                ? `“${query.trim()}” ile eşleşen sonuç yok. Telefonun son 4 hanesini deneyin.`
                : "Aramak için yazmaya başlayın."}
            </Command.Empty>

            {groups.map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="mb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[0.75rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-label-2"
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.id}
                      value={`${item.id} ${item.label}`}
                      onSelect={() => go(item.href)}
                      className="group flex min-h-10 cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-[0.9375rem] data-[selected=true]:bg-primary-fill data-[selected=true]:text-on-primary-fill"
                    >
                      <Icon aria-hidden className="size-[18px] shrink-0 text-primary group-data-[selected=true]:text-on-primary-fill" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="shrink-0 text-[0.8125rem] text-label-2 tabular-nums group-data-[selected=true]:text-[color:var(--on-primary-fill-2)]">
                          {item.hint}
                        </span>
                      )}
                      <CornerDownLeft aria-hidden className="hidden size-3.5 shrink-0 opacity-0 group-data-[selected=true]:opacity-100 md:block" />
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
