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

export interface NavSection {
  /** Bölüm başlığı (null ise başlıksız grup). */
  label: string | null;
  items: NavItem[];
}

/** Dashboard sol menüsü — başlıklı bölümler halinde. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Ana Menü",
    items: [
      { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/leadler", label: "Lead'ler", icon: Columns3 },
      { href: "/firsatlar", label: "Gelir Fırsatları", icon: Sparkles },
    ],
  },
  {
    label: "Randevu Yönetimi",
    items: [{ href: "/randevular", label: "Randevular", icon: CalendarDays }],
  },
  {
    label: "Satış & Tahsilat",
    items: [
      { href: "/tahsilat", label: "Tahsilat", icon: Banknote },
      { href: "/paketler", label: "Paketler", icon: Package },
    ],
  },
  {
    label: "İşletme",
    items: [{ href: "/hizmetler", label: "Hizmetler", icon: Scissors }],
  },
];

/** Tüm menü öğeleri (düz liste gerekirse). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
