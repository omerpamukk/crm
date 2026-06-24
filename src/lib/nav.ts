import {
  LayoutDashboard,
  Users,
  Columns3,
  Scissors,
  CalendarDays,
  CalendarRange,
  Package,
  Sparkles,
  ShoppingBag,
  BarChart3,
  Scale,
  Receipt,
  UserCog,
  Home,
  ShoppingCart,
  MessageSquare,
  Megaphone,
  Workflow,
  Globe,
  Building2,
  Settings,
  Crown,
  Link2,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Canlı sayaç rozeti anahtarı (layout'tan beslenir). */
  badge?: string;
}

export interface NavSection {
  /** Bölüm anahtarı (açık/kapalı durumu için). */
  key: string;
  label: string;
  /** Bölüm başlığı ikonu. */
  icon: LucideIcon;
  items: NavItem[];
  /** Henüz yapılmamış bölüm — "Yakında" rozeti gösterilir. */
  comingSoon?: boolean;
}

/** Dashboard sol menüsü — katlanabilir bölümler halinde. */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "ana",
    label: "Ana Menü",
    icon: Home,
    items: [
      { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard },
      { href: "/yonetici", label: "Yönetici Paneli", icon: Crown },
      { href: "/raporlar", label: "Raporlar", icon: BarChart3 },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/leadler", label: "Lead'ler", icon: Columns3 },
      { href: "/firsatlar", label: "Gelir Fırsatları", icon: Sparkles },
    ],
  },
  {
    key: "satis",
    label: "Satış & Tahsilat",
    icon: ShoppingCart,
    items: [
      { href: "/tahsilat", label: "Satışlar", icon: ShoppingBag },
      { href: "/cari", label: "Cari Hesap", icon: Scale, badge: "overdueCari" },
      { href: "/giderler", label: "Giderler", icon: Receipt },
      { href: "/paketler", label: "Paketler", icon: Package },
    ],
  },
  {
    key: "randevu",
    label: "Randevu Yönetimi",
    icon: CalendarRange,
    items: [
      { href: "/takvim", label: "Takvim", icon: CalendarRange },
      { href: "/randevular", label: "Randevular", icon: CalendarDays },
      { href: "/randevu-linki", label: "Randevu Linki", icon: Link2 },
    ],
  },
  {
    key: "mesajlasma",
    label: "Mesajlaşma",
    icon: MessageSquare,
    items: [
      { href: "/mesajlar", label: "Tüm Mesajlar", icon: Inbox, badge: "msgAll" },
    ],
  },
  {
    key: "pazarlama",
    label: "Pazarlama",
    icon: Megaphone,
    items: [],
    comingSoon: true,
  },
  {
    key: "akis",
    label: "İş Akışları",
    icon: Workflow,
    items: [],
    comingSoon: true,
  },
  {
    key: "web",
    label: "Web Sitesi Yönetimi",
    icon: Globe,
    items: [],
    comingSoon: true,
  },
  {
    key: "isletme",
    label: "İşletme",
    icon: Building2,
    items: [
      { href: "/hizmetler", label: "Hizmetler", icon: Scissors },
      { href: "/personel", label: "Personel", icon: UserCog },
    ],
  },
  {
    key: "sistem",
    label: "Sistem",
    icon: Settings,
    items: [],
    comingSoon: true,
  },
];

/** Tüm menü öğeleri (düz liste gerekirse). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Verilen yola karşılık gelen bölümün anahtarı (aktif bölümü açmak için). */
export function sectionKeyForPath(pathname: string): string | null {
  for (const section of NAV_SECTIONS) {
    if (
      section.items.some(
        (i) => pathname === i.href || pathname.startsWith(`${i.href}/`)
      )
    ) {
      return section.key;
    }
  }
  return null;
}
