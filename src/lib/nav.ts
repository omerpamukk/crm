import {
  LayoutDashboard,
  Users,
  Columns3,
  Scissors,
  CalendarDays,
  Package,
  Sparkles,
  Banknote,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Dashboard sol menü öğeleri. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/leadler", label: "Lead'ler", icon: Columns3 },
  { href: "/hizmetler", label: "Hizmetler", icon: Scissors },
  { href: "/randevular", label: "Randevular", icon: CalendarDays },
  { href: "/firsatlar", label: "Gelir Fırsatları", icon: Sparkles },
  { href: "/paketler", label: "Paketler", icon: Package },
  { href: "/tahsilat", label: "Tahsilat", icon: Banknote },
];
