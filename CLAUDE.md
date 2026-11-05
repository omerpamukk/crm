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
Kaynak: `src/app/globals.css` (Tailwind v4 `@theme` tokenları + `@layer utilities`).

- Hazır sınıflar: `.page-shell`, `.page-title`, `.surface`, `.surface-flat`,
  `.section-label`, `.section-title`, `.metric-value`, `.status-dot`,
  `.row-list`, `.skeleton`, `.focus-ring`, `.shadow-soft`.
- Yasak: `bg-gradient-*`, arayüz metninde emoji, glassmorphism, renkli ikon
  kutucuğu, kart içinde kart, sabit hex renk (koyu temayı bozar —
  `var(--primary)`, `var(--chart-1..5)` gibi tokenları kullan).
- Renk yalnızca anlam taşır; tek vurgu rengi `primary`. Kartlar `rounded-xl`
  + `shadow-soft`; sayfa ritmi `space-y-8`, grid `gap-4`/`gap-5`.
- Yığın: shadcn/ui (Radix), `motion/react`, `@dnd-kit`, `cmdk`, `recharts`,
  `sonner`, `lucide-react`. Yeni paket ancak gerçekten kullanılacaksa;
  kurulum `npm install --legacy-peer-deps`.
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
