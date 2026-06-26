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
  CalendarClock,
  Zap,
  Bell,
  Mail,
  PenLine,
  LayoutGrid,
  Newspaper,
  Gauge,
  Boxes,
  MapPin,
  FileSignature,
  ListTodo,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Canlı sayaç rozeti anahtarı (layout'tan beslenir). */
  badge?: string;
  /** Sabit metin etiketi (ör. "AI", "YENİ"). */
  tag?: string;
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
    items: [
      { href: "/reklamlar", label: "Reklamlar", icon: Megaphone, tag: "AI" },
      { href: "/sosyal-medya", label: "Sosyal Medya Planlamaları", icon: CalendarClock },
      { href: "/metin-yazici", label: "Metin Yazıcı", icon: PenLine, tag: "AI" },
    ],
  },
  {
    key: "akis",
    label: "İş Akışları",
    icon: Workflow,
    items: [
      { href: "/otomasyonlar", label: "Otomasyonlar", icon: Zap, badge: "automations" },
      { href: "/hatirlaticilar", label: "Hatırlatıcılar", icon: Bell },
      { href: "/eposta-sms", label: "E-posta & SMS", icon: Mail },
    ],
  },
  {
    key: "web",
    label: "Web Sitesi Yönetimi",
    icon: Globe,
    items: [
      { href: "/sayfalar", label: "Sayfalar", icon: LayoutGrid },
      { href: "/blog", label: "Blog", icon: Newspaper },
      { href: "/seo", label: "SEO", icon: Gauge },
      { href: "/bulten", label: "Bülten", icon: Mail },
    ],
  },
  {
    key: "isletme",
    label: "İşletme",
    icon: Building2,
    items: [
      { href: "/hizmetler", label: "Hizmetler & Fiyatlar", icon: Scissors },
      { href: "/personel", label: "Personel", icon: UserCog },
      { href: "/stok", label: "Stok Yönetimi", icon: Boxes },
      { href: "/giderler", label: "Gider Yönetimi", icon: Receipt },
      { href: "/yorumlar", label: "Google Maps & Yorumlar", icon: MapPin },
      { href: "/belgeler", label: "Belge İmzalama", icon: FileSignature },
    ],
  },
  {
    key: "sistem",
    label: "Sistem",
    icon: Settings,
    items: [
      { href: "/gorevler", label: "Görev Sistemi", icon: ListTodo, badge: "tasks" },
      { href: "/raporlama", label: "Rapor Oluştur", icon: FileBarChart },
    ],
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
