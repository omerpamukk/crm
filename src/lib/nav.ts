import {
  LayoutDashboard,
  Users,
  Columns3,
  Scissors,
  CalendarDays,
  CalendarRange,
  Package,
  Sparkles,
  Banknote,
  BarChart3,
  Scale,
  Receipt,
  UserCog,
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
      { href: "/raporlar", label: "Raporlar", icon: BarChart3 },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/leadler", label: "Lead'ler", icon: Columns3 },
      { href: "/firsatlar", label: "Gelir Fırsatları", icon: Sparkles },
    ],
  },
  {
    label: "Randevu Yönetimi",
    items: [
      { href: "/takvim", label: "Takvim", icon: CalendarRange },
      { href: "/randevular", label: "Randevular", icon: CalendarDays },
    ],
  },
  {
    label: "Satış & Tahsilat",
    items: [
      { href: "/tahsilat", label: "Tahsilat", icon: Banknote },
      { href: "/cari", label: "Cari Hesap", icon: Scale },
      { href: "/giderler", label: "Giderler", icon: Receipt },
      { href: "/paketler", label: "Paketler", icon: Package },
    ],
  },
  {
    label: "İşletme",
    items: [
      { href: "/hizmetler", label: "Hizmetler", icon: Scissors },
      { href: "/personel", label: "Personel", icon: UserCog },
    ],
  },
];

/** Tüm menü öğeleri (düz liste gerekirse). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
