"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Firmalar", ownerOnly: false },
  { href: "/admin/ekip", label: "Ekip", ownerOnly: true },
  { href: "/admin/gunluk", label: "Günlük", ownerOnly: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/firma");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Admin bölümleri. Masaüstünde üst çubukta, telefonda üst çubuğun altında
 * tam genişlik bir segment satırı. Tek bölüm varsa (sahip değil) gösterilmez.
 */
export function AdminNav({ isOwner, variant }: { isOwner: boolean; variant: "bar" | "mobile" }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.ownerOnly || isOwner);
  if (links.length < 2) return null;

  if (variant === "mobile") {
    return (
      <nav aria-label="Admin bölümleri" className="flex gap-1 rounded-xl bg-fill p-1 md:hidden">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex h-11 flex-1 items-center justify-center rounded-lg text-subhead font-semibold whitespace-nowrap",
                active ? "bg-surface text-label shadow-sm" : "text-label-2"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Admin bölümleri" className="hidden items-center gap-1 md:flex">
      {links.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring hover-tint rounded-lg px-3 py-2 text-subhead font-semibold whitespace-nowrap",
              active ? "text-label" : "text-label-2"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
