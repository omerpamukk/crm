@AGENTS.md

# CRM — Proje El Kitabı

Hizmet sektörü işletmeleri için genel, çok kiracılı SaaS CRM — güzellik
salonları ana müşteri grubu ama tek niş değil (klinik, stüdyo, danışmanlık…).
Arayüz dili Türkçe; metin ve örneklerde salona özgü dil yerine genel hizmet
işletmesi dili kullan. Kurulum, klasör yapısı ve rol tablosu: `README.md`.

## Ürün ilkesi: kafa karışıklığı yok

Bu paneli işletme sahipleri, resepsiyonistler ve uzmanlar eğitim almadan,
kafası karışmadan kullanabilmeli. Kullanıcının açık isteği; tüm ekip için
bağlayıcı ve diğer tüm kurallardan önce gelir. Her ekran ve metin şu
ölçütlerle sınanır:

- **Tek şey, tek ad.** Menü adı = sayfa başlığı = düğme = bildirim metni.
  Aynı şey için iki farklı terim kullanılmaz.
- **Sade Türkçe.** Arayüzde teknik terim, kod adı, ortam değişkeni, ham hata
  kodu görünmez. Yerleşmiş İngilizce terimler (ör. "Lead'ler") için sade
  karşılık önerilir, kararı kullanıcı verir.
- **Her ekranın tek ana işi ve tek birincil düğmesi** vardır, hep aynı yerde
  (başlığın sağında).
- **Aynı iş, aynı desen.** Liste hep aynı tablo, filtre hep aynı satır, form
  hep aynı yerleşim. Sayfaya özel tek seferlik çözüm yok.
- **Çıkmaz yok.** Boş ekran ne yapılacağını söyler ve düğmesini sunar. Hata
  mesajı ne olduğunu ve ne yapılacağını söyler.
- **Görünen her şey çalışır.** Yarım ya da demo özellik gerçekmiş gibi
  görünmez; rolün yapamadığı şey o role gösterilmez.
- **Her eylem geri bildirim verir.** Geri alınamayan eylem önce onay ister.
- **Gelişmiş seçenekler kapalı başlar.** Varsayılan akış en sık işi en az
  adımla yapar.
- **Temel işler** (müşteri eklemek, randevu oluşturmak, tahsilat almak, paket
  satmak) her yerden en fazla iki tıkla başlar ve yardımsız biter.

## Ekip

- **Ana oturum = Şef.** Kullanıcıdan bir iş geldiğinde (özellik, düzeltme,
  tasarım, yeniden yapılandırma) önce `sef` skill'ini yükle; işi o protokolle
  planla ve uzmanlara dağıt.
- **Uzmanlar** (`.claude/agents/`): `backend`, `tasarimci`, `frontend`,
  `kalite`, `denetci`. Uzmansan yalnızca brifteki kapsamda çalış; kapsam
  dışı bir sorun görürsen düzeltme, raporunda belirt.

## Değişmez kurallar

- **Next.js 16**: Next'e özgü bir API (routing, caching, server action,
  metadata, middleware/proxy…) yazmadan önce `node_modules/next/dist/docs/`
  altındaki ilgili rehberi oku.
- **Veritabanı iki aşamalı**: şema değişikliği = `supabase/migrations/NNNN_ad.sql`.
  Tekrar-güvenli (`if not exists`, `drop policy if exists`), RLS
  `current_business_id()` üzerine kurulu, mevcut politikalara dokunmaz.
  Migration'ı **hiçbir ajan çalıştırmaz, veritabanına bağlanmaz** — kullanıcı
  Supabase SQL Editor'da elle çalıştırır ve onaylar; ona bağlı kod ancak
  ondan sonra canlıya çıkar. `src/types/database.ts` elle güncellenir.
- **Çok kiracılık**: her okuma/yazma `business_id` ile sınırlı
  (`getBusinessId()`); RLS ikinci savunma hattıdır, tek hat değil. Yetki:
  sayfada `requireCapability()`, arayüzde `can()` (`src/lib/permissions.ts`).
- **Gerçek veri**: gerçek sayfalarda uydurma sayı yok. Dış entegrasyon
  bekleyen ekranlar örnek veriyle çalışır ve `DemoBanner` ile işaretlidir.
- **Sırlar**: `credentials`, servis anahtarları istemciye gitmez; `.env`
  commit edilmez.
- **Git**: commit/push yalnızca kullanıcı isteyince. `main`'e push = otomatik
  canlı yayın (Vercel). Commit mesajı Türkçe conventional: `feat(modul): …`.

## Modül deseni

`<modul>/schema.ts` (zod) → `<modul>/actions.ts` (`"use server"`;
`safeParse` → `getBusinessId` → Supabase → `revalidatePath`; `{ error?: string }`
döner, ham DB hatası kullanıcıya gösterilmez) → `<modul>/*-form.tsx`
(react-hook-form + zodResolver). `page.tsx` sunucu bileşeni veriyi çeker,
`*-view.tsx` istemci bileşeni etkileşimi yönetir, her sayfanın `loading.tsx`
iskeleti vardır. Biçimlendirme `src/lib/format.ts`, URL'de tutulan filtreler
`src/lib/use-url-state.ts`.

## Tasarım dili (güncel)

Sahibi `tasarimci`; tasarım sistemi değişirse bu bölümü o günceller.
Dil **E+F** (Kasım 2026, kullanıcının seçimi): E — Apple HIG düzeni, Liquid
Glass yalnızca kontrol katmanında, Indigo vurgu, gri monogram, sistem yazı
tipi; F — yay hareketi, sürükle-fırlat, renkli yüzde hapları, zemindeki hafif
ışık, yeşil Geldi. Kaynak taslak `docs/tasarim-ef/`; canlı referans
**`/vitrin`** (yalnızca geliştirmede; bütün bileşenler, açık/koyu yan yana).
Tokenlar `src/app/globals.css`, hareket `src/lib/motion.ts`.

- **Katmanlar.** İçerik (liste, tablo, kart, form) her zaman opak:
  `.surface` / `bg-surface`. Cam (`.glass`, `.glass-strong`) yalnızca kontrol
  katmanında: kenar çubuğu, araç çubuğu öğeleri, sekme çubuğu, açılır menü,
  alt sayfa, bildirim. Zemin `.app-wall` (gri + hafif Indigo ışık) kabukta.
- **Renk.** Yalnızca tokenlardan; sabit hex yok. Tek vurgu Indigo:
  `primary` (süs/metin), `primary-fill` (düğme dolgusu), `primary-text`
  (bağlantı), `primary-soft`. Etiketler `label`, `label-2`, `label-3`
  (yalnız yer tutucu), renkli zeminde `text-label-2w`; dolgu `fill`,
  `fill-2`, `hover`, `press`; ayırıcı `separator`. Durum: `positive`
  (yeşil #008932, Geldi), `danger` (borç, gecikme), `warning` (turuncu,
  paket ≤2), `info` (mavi, yeni) — her biri `-text`, `-dot`, `-soft` ile.
  Renk tek başına anlam taşımaz; yanında simge ya da metin olur.
- **Tipografi.** Sistem yığını (SF Pro / Segoe UI). Ölçek: `text-large-title`,
  `text-title-2/3`, `text-headline`, `text-body`, `text-callout`,
  `text-subhead`, `text-footnote`, `text-caption`. Rakamlar `tabular-nums`.
- **Grafik.** `TrendChart` (Genel Bakış'taki Ciro sparkline'ının büyüğü):
  tek eksen, sıfır taban, kılcal ızgara, etiketler tek satır (sığmazsa
  seyrekleşir); değer kutusu üzerine gelince, dokununca ve ← → ile. Seri
  `primary`, karşılaştırma gri; metin seri renginde olmaz. Veri yoksa
  grafik değil `EmptyState`.
- **Hazır sınıflar.** `.page-shell`, `.page-title` (34/30px, tek satır),
  `.eyebrow`, `.surface`, `.surface-flat`, `.section-label`,
  `.section-title`, `.metric-value`, `.status-dot`, `.row-list`,
  `.inset-rows` (ayırıcı metinden başlar, `--row-inset`), `.skeleton`,
  `.focus-ring`, `.hover-tint`, `.pressable`, `.pop-anim`, `.glass`,
  `.glass-strong`, `.scrollbar-none`, `.shadow-soft`, `.shadow-pop`,
  `.sheet-footer` (FormSheet alt şeridi).
- **Bileşenler** (yenisini yazmadan önce bunlara bak):
  `ui/` Button (prominent, glass, secondary, tinted, plain, destructive,
  destructive-solid), SegmentedControl, Sheet (`side="auto"`), Popover,
  DropdownMenu, Dialog, SearchField, Avatar, Badge, `toastUndo`, Switch
  (anahtar, 44px hedef, `label` zorunlu), Disclosure ("Gelişmiş" açılır
  bölüm, kapalı başlar);
  `shared/` PageHeader (`leading`: başlığın solunda Avatar / geri),
  MetricStrip + Metric, StatCard (eski), DeltaPill, Sparkline, TrendChart
  (çizgi/sütun trend grafiği, `unit` money/number/percent, isteğe bağlı
  gri `compare`), StatusDot, StatusBadge, PackageProgress, Money,
  ListGroup + ListRow, DataTable (telefonda `mobileInset`, `mobileSwipe`),
  FilterBar + FilterToken, FormSheet + FormActions (her form ve ayrıntı
  paneli; `footer` alt eylem şeridi), EmptyState, ErrorState, Skeleton*,
  SwipeRow, GeldiButton, AppointmentBlock (takvim ve Genel Bakış
  çizelgesi; durum rengi `appointmentTone`, sıradaki `highlight`),
  DemoBanner; `layout/` ToolbarAction. Telefonda segment `size="touch"`
  (44px dokunma hedefi). Sayfa klasöründe bunların yerel kopyası yazılmaz.
- **Adlar.** Hizmeti veren kişi her yerde **Personel** (URL `personel`);
  "Uzman" yalnızca rol adı. Eylemler: Yeni randevu, Yeni müşteri, Ödeme al,
  Yeni lead. Randevu durum rengi `appointmentStatusVariant`: Planlandı
  mavi, Geldi yeşil, Gelmedi kırmızı, Tamamlandı ve İptal nötr.
- **Sayfa iskeleti.** `PageHeader` (eyebrow, title, description, `context`)
  büyük başlığı çizer; eylemler sayfada değil araç çubuğundadır:
  `search` · `secondary` · **tek** `primary` (`<ToolbarAction prominent …/>`;
  telefonda sağ üstte cam "+"). Liste ekranı: PageHeader → MetricStrip →
  FilterBar → DataTable. Sayfa ritmi `space-y-8`, grid `gap-4`/`gap-5`.
- **Kabuk.** ≥1280 yüzen cam kenar çubuğu (gizlenebilir, tercih çerezde);
  768–1279 kenar çubuğu düğmeyle içeriğin üstüne açılır; <768 cam sekme
  çubuğu (Genel Bakış · Randevular · Müşteriler · Menü) + ayrı arama düğmesi,
  Menü alt sayfada. Komut paleti ⌘K/Ctrl+K. Tema: kullanıcı menüsünde
  Açık / Koyu / Sistem (varsayılan Sistem).
- **Menü.** Yedi başlık (Genel Bakış, Randevular, Müşteriler, Satışlar,
  Pazarlama, Raporlar, İşletme) + açılan modüller (Lead'ler, Paketler, Stok,
  Görevler). Aynı işin sayfaları menüde tek satır, sayfada `PageTabs`
  segmenti (`src/lib/nav.ts` `tabs`). Yeni sayfa önce bir gruba girer;
  menüye ancak ayrı bir iş ise yeni başlık eklenir.
- **Telefonda uygulama.** Ana ekrana eklenince tam ekran açılır
  (`manifest.ts`, `appleWebApp`); üst çubuk `--toolbar-h` durum çubuğu
  payını içerir.
- **Hareket.** Her hareket yaydır (`spring.default` sıçramasız ~0.35 sn,
  `spring.momentum` fırlatmadan sonra hafif sıçrama); motion'ın `animate`,
  `drag`, `dragElastic` (lastik bant) ve `useMotionPreset` kullanılır, elle
  yay motoru yazılmaz. Açılan öğe tetikleyicisinden gelir, aynı yoldan
  kapanır. Basınca anında tepki (`.pressable`). Hareket azaltma açıksa kayma
  ve ölçek yok, kısa opaklık geçişi var (MotionConfig + CSS). Kaydırarak
  işlem (SwipeRow) hiçbir eylemin tek yolu olamaz.
- **Yasak.** İçerik katmanında cam; cam dışında dekoratif gradient
  (`bg-gradient-*`); renkli ikon kutucuğu; renkli avatar; kart içinde kart;
  sabit hex; arayüz metninde emoji; bir ekranda ikinci prominent düğme;
  araç çubuğu dışında sayfa başına "yeni" düğmesi (yeni ekranlarda).
- **Erişilebilirlik.** AA kontrast (tokenlar ölçülü), görünür odak
  (3px `--focus`), klavye (segment ←→, tablo ↑↓ Enter), `aria-label`;
  şeffaflık azaltma ve artırılmış kontrastta cam opaklaşır.
- Yığın: shadcn/ui (Radix), `motion/react`, `next-themes`, `@dnd-kit`,
  `cmdk`, `recharts`, `sonner`, `lucide-react`. Yeni paket ancak gerçekten
  kullanılacaksa; kurulum `npm install --legacy-peer-deps`.
- Her ekranda: boş / yükleniyor / hata durumu, 375px mobil genişlik, klavye
  ile kullanım, koyu tema.
- **Metin kırılmaz, yerleşim esner** (kullanıcının açık isteği): etiket, KPI
  başlığı, rozet, düğme metni ve "sayı + birim" grupları tek satırda kalır.
  Dar ekranda sütun sayısı azalır, kart kompakt satıra döner ya da şerit
  yatay kayar; gerekirse metin kısalır, son çare `truncate` + `title`.
  375px'te iki satıra kırılan tek bir etiket hata sayılır.

## Doğrulama

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build`.
CI ilk üçünü çalıştırır. Yerel sunucu: `npx next dev --webpack` — Turbopack
(`npm run dev`) bu makinede `next/font/google` çözümlerken 500 veriyor
(Kasım 2026, kök neden belirsiz). "Bitti" demeden önce dokunduğun alana uygun olanları
çalıştır; başarısız olanı olduğu gibi raporla.
