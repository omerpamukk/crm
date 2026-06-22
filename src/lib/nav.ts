import {
  LayoutDashboard,
  Users,
  Scissors,
  CalendarDays,
  Package,
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
  { href: "/hizmetler", label: "Hizmetler", icon: Scissors },
  { href: "/randevular", label: "Randevular", icon: CalendarDays },
  { href: "/paketler", label: "Paketler", icon: Package },
];
