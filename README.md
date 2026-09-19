# CRM

Güzellik merkezi / salon işletmeleri için web tabanlı SaaS CRM. Müşteri,
randevu, paket, tahsilat, personel ve stok yönetimi; online randevu linki;
platform yöneticisi için çok kiracılı admin paneli.

## Teknoloji Yığını

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — CSS tabanlı yapılandırma; ayrı `tailwind.config`
  dosyası yoktur, tokenlar `src/app/globals.css` içinde `@theme` ile tanımlıdır
- **shadcn/ui** (Radix tabanlı bileşenler)
- **Supabase** — Postgres + Auth + Storage, çok kiracılı RLS
- **zod + react-hook-form** — form doğrulama
- **Vitest** — birim testleri

## Kurulum

```bash
npm install --legacy-peer-deps
cp .env.example .env    # Supabase bilgilerini doldur
npm run dev
```

> `--legacy-peer-deps` gerekiyor: `shadcn` paketinin babel bağımlılıkları
> diğer paketlerle çakışıyor.

### Veritabanı

Migration'lar `supabase/migrations/` altında, numaralı sırayla. Supabase CLI
kullanılmıyor; her dosya **Supabase SQL Editor'da elle çalıştırılır**.
Hepsi tekrar-güvenlidir (`if not exists` / `drop policy if exists`).

Kurulum sonrası Supabase panelinde:
- **Authentication > URL Configuration** → Site URL ve
  `<alan-adı>/auth/callback` Redirect URL olarak eklenmeli

### Zamanlanmış görevler

`vercel.json` tek bir cron tanımlar: `/api/cron/reminders`, her gün
05:00 UTC (08:00 TR). **Vercel Hobby planı günde birden fazla cron
çalıştırmaya izin vermez** — daha sık bir ifade yazılırsa deploy
doğrulamada reddedilir. Pro plana geçilirse aralık sıklaştırılabilir.

Elle tetiklemek için:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" <alan-adı>/api/cron/reminders
```

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (tek tur) |
| `npm run test:watch` | Vitest (izleme) |

## Klasör Yapısı

```
src/
├── app/
│   ├── (auth)/           # giris, sifremi-unuttum, yeni-sifre
│   ├── (dashboard)/      # işletme paneli (korumalı)
│   ├── admin/            # platform yöneticisi paneli
│   ├── randevu/[token]/  # herkese açık online randevu
│   ├── ajans/[token]/    # ajans salt-okunur erişimi
│   └── api/cron/         # zamanlanmış görevler
├── components/
│   ├── ui/               # shadcn/ui bileşenleri
│   ├── layout/           # sidebar, üst bar, komut paleti
│   └── shared/           # PageHeader, StatCard, EmptyState…
├── lib/
│   ├── supabase/         # client/server/admin, auth bağlamı, guard
│   ├── messaging/        # SMS / e-posta / WhatsApp gönderimi
│   ├── permissions.ts    # rol-yetki matrisi
│   └── finance.ts        # para ve seans hesapları
└── types/database.ts     # tablo tipleri (elle yazılır)
```

## Modül Deseni

Yeni bir modül eklerken mevcut üçlü izlenir (örnek: `personel`):

| Katman | Dosya | İçerik |
|---|---|---|
| Şema | `<modul>/schema.ts` | zod şeması + `z.infer` tipi |
| Sunucu | `<modul>/actions.ts` | `safeParse` → `getBusinessId()` → Supabase → `revalidatePath()` |
| İstemci | `<modul>/<x>-form.tsx` | `react-hook-form` + `zodResolver` |

Server action'lar `{ error?: string }` döndürür; ham veritabanı hataları
kullanıcıya gösterilmez, `console.error` ile sunucuya yazılır.

## Roller

Firma içi üç rol (`src/lib/permissions.ts`):

| Rol | Yetki |
|---|---|
| **Yönetici** (`owner`) | Her şey — finans, raporlar, ayarlar dahil |
| **Resepsiyon** (`reception`) | Müşteri, randevu, tahsilat; gider/rapor göremez |
| **Uzman** (`specialist`) | Yalnızca kendi randevuları ve hakedişi |

Kısıtlama üç katmanda: RLS politikaları, sayfa kapısı (`requireCapability`)
ve menü süzmesi.

## Notlar

- `AGENTS.md`: Next.js 16 eğitim verisinden farklı — kod yazmadan önce
  `node_modules/next/dist/docs/` okunmalı.
- Entegrasyon bekleyen modüller (mesajlar, reklamlar, sosyal medya…)
  `DemoBanner` ile açıkça işaretlidir; örnek veri gösterirler.
