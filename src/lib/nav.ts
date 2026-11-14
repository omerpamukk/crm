import {
  LayoutDashboard,
  Users,
  Columns3,
  CalendarRange,
  Package,
  Sparkles,
  ShoppingBag,
  Boxes,
  BarChart3,
  Home,
  Building2,
  ListTodo,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/database";
import { can, type Capability } from "@/lib/permissions";
import { isModuleEnabled, moduleForPath } from "@/lib/modules";

/** Gruplu bir menü öğesinin sekmesi (sayfanın üstünde segment olarak çıkar). */
export interface NavTab {
  href: string;
  /** Sayfanın başlığıyla aynı ad ("Tek şey, tek ad"). */
  label: string;
  cap?: Capability;
}

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
   * Tanımsızsa herkes görür. Sekmeli öğede yetki sekme başınadır.
   */
  cap?: Capability;
  /**
   * Aynı işin sayfaları: menüde tek satır, sayfada sekme. Öğenin `href`'i
   * rolün ve modüllerin izin verdiği ilk sekmedir.
   */
  tabs?: NavTab[];
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
 * Dashboard menüsü (Kasım 2026, kullanıcı kararı: "kafa karışmasın").
 *
 * Yedi ana başlık; aynı işin sayfaları tek başlık altında sekme olur
 * (Takvim + liste, Satışlar + Cari Hesap, Fırsatlar + Kampanyalar +
 * Hatırlatmalar, Raporlar + Doluluk + Giderler, Hizmetler + Personel + Randevu
 * Linki). İkinci bölüm, işletmenin açtığı ek modüllerdir.
 *
 * Menüde OLMAYAN ama çalışan sayfa: /mesajlar — dış
 * entegrasyon bekleyen, örnek veriyle çalışan demo sayfalar.
 *
 * `cap` taşıyan her sayfa da aynı yetenekle `requireCapability` çağırır;
 * menü ile sayfa kapısı aynı kalmalı (nav.test.ts).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "ana",
    label: "Ana Menü",
    icon: Home,
    items: [
      { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard },
      {
        href: "/takvim",
        label: "Randevular",
        icon: CalendarRange,
        tabs: [
          { href: "/takvim", label: "Takvim" },
          { href: "/randevular", label: "Liste" },
        ],
      },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      {
        href: "/tahsilat",
        label: "Satışlar",
        icon: ShoppingBag,
        badge: "overdueCari",
        tabs: [
          { href: "/tahsilat", label: "Satışlar", cap: "tahsilat" },
          { href: "/cari", label: "Cari Hesap", cap: "tahsilat" },
        ],
      },
      {
        href: "/firsatlar",
        label: "Pazarlama",
        icon: Megaphone,
        tabs: [
          { href: "/firsatlar", label: "Gelir Fırsatları", cap: "musteri_yonet" },
          { href: "/kampanyalar", label: "Kampanyalar", cap: "musteri_yonet" },
          { href: "/hatirlaticilar", label: "Hatırlatmalar", cap: "musteri_yonet" },
          { href: "/yorumlar", label: "Yorumlar", cap: "musteri_yonet" },
        ],
      },
      {
        href: "/raporlar",
        label: "Raporlar",
        icon: BarChart3,
        tabs: [
          { href: "/raporlar", label: "Raporlar", cap: "raporlar" },
          { href: "/doluluk", label: "Doluluk", cap: "raporlar" },
          { href: "/giderler", label: "Giderler", cap: "finans" },
        ],
      },
      {
        href: "/hizmetler",
        label: "İşletme",
        icon: Building2,
        tabs: [
          { href: "/hizmetler", label: "Hizmetler", cap: "randevu_yonet" },
          { href: "/personel", label: "Personel", cap: "personel_yonet" },
          { href: "/randevu-linki", label: "Randevu Linki", cap: "randevu_yonet" },
        ],
      },
    ],
  },
  {
    key: "moduller",
    label: "Modüller",
    icon: Sparkles,
    items: [
      { href: "/leadler", label: "Lead'ler", icon: Columns3, cap: "musteri_yonet" },
      { href: "/paketler", label: "Paketler", icon: Package, cap: "tahsilat" },
      { href: "/stok", label: "Stok", icon: Boxes, cap: "tahsilat" },
      { href: "/gorevler", label: "Görevler", icon: ListTodo },
    ],
  },
];

/** Menüdeki her sayfa (sekmeler dahil), düz liste: başlık ve kapı için. */
export const NAV_PAGES: NavTab[] = NAV_SECTIONS.flatMap((s) =>
  s.items.flatMap((i) => i.tabs ?? [{ href: i.href, label: i.label, cap: i.cap }])
);

/** Geriye dönük: menü öğeleri (düz). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

function pageVisible(page: NavTab, role: UserRole, modules: readonly string[] | null): boolean {
  if (page.cap && !can(role, page.cap)) return false;
  const mod = moduleForPath(page.href);
  return !mod || isModuleEnabled(modules, mod);
}

/**
 * Menüyü role ve açık modüllere göre süzer: yetkisiz ya da kapalı modüle ait
 * sayfalar gizlenir, sekmesi kalmayan öğe ve boş kalan bölüm düşer.
 * Bu yalnızca görsel gizleme — asıl koruma sayfa kapısında, server
 * action'larda ve RLS'te.
 */
export function navSectionsForRole(role: UserRole, modules: readonly string[] | null = null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.flatMap((item): NavItem[] => {
      if (!item.tabs) return pageVisible(item, role, modules) ? [item] : [];
      const tabs = item.tabs.filter((t) => pageVisible(t, role, modules));
      if (tabs.length === 0) return [];
      return [{ ...item, href: tabs[0].href, tabs }];
    }),
  })).filter((section) => section.items.length > 0);
}

/** Rolün açabildiği tüm sayfalar (sekmeler dahil), menü sırasıyla. */
export function navPagesForRole(
  role: UserRole,
  modules: readonly string[] | null = null
): (NavTab & { icon: LucideIcon })[] {
  return navSectionsForRole(role, modules).flatMap((s) =>
    s.items.flatMap((i) => (i.tabs ?? [{ href: i.href, label: i.label, cap: i.cap }]).map((t) => ({ ...t, icon: i.icon })))
  );
}

function onPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Menü öğesi bu sayfada mı (sekmeleri dahil). */
export function isItemActive(pathname: string, item: Pick<NavItem, "href" | "tabs">): boolean {
  if (item.tabs) return item.tabs.some((t) => onPath(pathname, t.href));
  return onPath(pathname, item.href);
}

/** Yola karşılık gelen (süzülmüş) menü öğesi. */
export function itemForPath(pathname: string, sections: NavSection[]): NavItem | null {
  for (const s of sections) for (const i of s.items) if (isItemActive(pathname, i)) return i;
  return null;
}

/** Yolun sayfa adı (araç çubuğundaki küçük başlık için). */
export function pageLabelForPath(pathname: string): string | null {
  const exact = NAV_PAGES.find((p) => pathname === p.href) ?? NAV_PAGES.find((p) => onPath(pathname, p.href));
  return exact?.label ?? null;
}

/** Verilen yola karşılık gelen bölümün anahtarı (aktif bölümü açmak için). */
export function sectionKeyForPath(pathname: string): string | null {
  for (const section of NAV_SECTIONS) {
    if (section.items.some((i) => isItemActive(pathname, i))) return section.key;
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
