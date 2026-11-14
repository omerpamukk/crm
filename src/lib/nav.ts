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
  Building2,
  TrendingUp,
  Link2,
  Bell,
  ListTodo,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/database";
import { can, type Capability } from "@/lib/permissions";
import { isModuleEnabled, moduleForPath } from "@/lib/modules";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Canlı sayaç rozeti anahtarı (layout'tan beslenir). */
  badge?: string;
  /** Sabit metin etiketi (ör. "AI", "YENİ"). */
  tag?: string;
  /**
   * Bu öğeyi görmek için gereken yetenek (src/lib/permissions.ts).
   * Tanımsızsa herkes görür.
   */
  cap?: Capability;
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

/**
 * Dashboard sol menüsü — katlanabilir bölümler halinde.
 *
 * Menüde OLMAYAN ama çalışan sayfalar (Kasım 2026, kullanıcı kararı):
 * /mesajlar, /eposta-sms, /yorumlar — dış entegrasyon bekleyen, örnek
 * veriyle çalışan demo sayfalar. İlgili bağlantı (WhatsApp/SMS/Google)
 * kurulunca buraya geri eklenir.
 *
 * `cap` taşıyan öğelerin sayfası da aynı yetenekle `requireCapability`
 * çağırır; menü ile sayfa kapısı aynı kalmalı.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "ana",
    label: "Ana Menü",
    icon: Home,
    items: [
      { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard },
      { href: "/takvim", label: "Takvim", icon: CalendarRange },
      { href: "/randevular", label: "Randevular", icon: CalendarDays },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/gorevler", label: "Görevler", icon: ListTodo },
    ],
  },
  {
    key: "satis",
    label: "Satış",
    icon: ShoppingCart,
    items: [
      { href: "/tahsilat", label: "Satışlar", icon: ShoppingBag, cap: "tahsilat" },
      { href: "/paketler", label: "Paketler", icon: Package, cap: "tahsilat" },
      { href: "/cari", label: "Cari Hesap", icon: Scale, badge: "overdueCari", cap: "tahsilat" },
    ],
  },
  {
    key: "buyume",
    label: "Büyüme",
    icon: TrendingUp,
    items: [
      { href: "/leadler", label: "Lead'ler", icon: Columns3, cap: "musteri_yonet" },
      { href: "/firsatlar", label: "Gelir Fırsatları", icon: Sparkles, cap: "musteri_yonet" },
      { href: "/randevu-linki", label: "Randevu Linki", icon: Link2, cap: "randevu_yonet" },
      { href: "/hatirlaticilar", label: "Hatırlatmalar", icon: Bell, cap: "musteri_yonet" },
    ],
  },
  {
    key: "yonetim",
    label: "Yönetim",
    icon: Building2,
    items: [
      { href: "/raporlar", label: "Raporlar", icon: BarChart3, cap: "raporlar" },
      { href: "/hizmetler", label: "Hizmetler", icon: Scissors, cap: "randevu_yonet" },
      { href: "/personel", label: "Personel", icon: UserCog, cap: "personel_yonet" },
      { href: "/stok", label: "Stok", icon: Package, cap: "tahsilat" },
      { href: "/giderler", label: "Giderler", icon: Receipt, cap: "finans" },
    ],
  },
];

/** Tüm menü öğeleri (düz liste gerekirse). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/**
 * Menüyü role ve açık modüllere göre süzer: yetkisiz ya da kapalı modüle ait
 * öğeler gizlenir, boş kalan bölüm düşer.
 * Bu yalnızca görsel gizleme — asıl koruma server action'larda ve RLS'te.
 */
export function navSectionsForRole(role: UserRole, modules: readonly string[] | null = null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.cap && !can(role, item.cap)) return false;
      const mod = moduleForPath(item.href);
      return !mod || isModuleEnabled(modules, mod);
    }),
  })).filter((section) => section.items.length > 0);
}

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

/**
 * Telefon sekme çubuğu (iOS 26 düzeni): üç sık sayfa + "Menü".
 * Arama ayrı bir düğmedir. Sekmeler de role göre süzülür; rolün göremediği
 * sayfa sekmede de görünmez.
 */
export const MOBILE_TAB_HREFS = ["/panel", "/takvim", "/musteriler"] as const;

/** Rolün görebildiği sekme sayfaları (Menü sekmesi her zaman ayrıca vardır). */
export function mobileTabsForRole(role: UserRole, modules: readonly string[] | null = null): NavItem[] {
  const visible = new Map(
    navSectionsForRole(role, modules)
      .flatMap((s) => s.items)
      .map((i) => [i.href, i] as const)
  );
  return MOBILE_TAB_HREFS.map((href) => visible.get(href)).filter(
    (i): i is NavItem => Boolean(i)
  );
}
