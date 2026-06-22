# CRM

Web tabanlı SaaS CRM uygulaması. Bu repo, projenin temiz başlangıç iskeletidir — henüz sayfa/ekran içermez.

## Teknoloji Yığını

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4** (CSS tabanlı yapılandırma — ayrı `tailwind.config` dosyası yoktur, tokenlar `src/app/globals.css` içinde `@theme` ile tanımlıdır)
- **shadcn/ui** (Radix tabanlı bileşenler)
- **Supabase** (`@supabase/supabase-js`)
- **ESLint**

## Klasör Yapısı

```
src/
├── app/
│   ├── (auth)/         # Kimlik doğrulama route grubu (login, register vb.)
│   ├── (dashboard)/    # Uygulama içi route grubu (korumalı sayfalar)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css     # Tailwind + tasarım tokenları
├── components/
│   ├── ui/             # shadcn/ui bileşenleri
│   ├── layout/         # Sayfa düzeni bileşenleri (header, sidebar vb.)
│   └── shared/         # Yeniden kullanılabilir ortak bileşenler
├── lib/
│   ├── supabase.ts     # Supabase istemcisi (.env'den okur)
│   └── utils.ts        # Yardımcı fonksiyonlar (cn vb.)
└── types/              # Paylaşılan TypeScript tipleri
```

## Tasarım Tokenları

`src/app/globals.css` içinde tanımlı temel tokenlar:

| Token       | Değer     |
|-------------|-----------|
| `primary`   | `#5B5BD6` |
| `positive`  | `#16A34A` |
| `warning`   | `#F59E0B` |
| `danger`    | `#E11D48` |
| `radius`    | `8px`     |

Tailwind sınıfı olarak kullanım: `bg-primary`, `text-positive`, `bg-warning`, `text-danger` vb.

## Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını Supabase bilgilerinle doldur

# 3. Geliştirme sunucusunu başlat
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Ortam Değişkenleri

| Değişken                        | Açıklama                         |
|---------------------------------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase proje URL'i             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonim (public) anahtar |

> ⚠️ Gerçek `.env` dosyası `.gitignore` ile yoksayılır ve **asla commit edilmez**. Yalnızca `.env.example` versiyon kontrolünde tutulur.

## Komutlar

| Komut           | Açıklama            |
|-----------------|---------------------|
| `npm run dev`   | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi    |
| `npm run start` | Üretim sunucusu     |
| `npm run lint`  | ESLint kontrolü     |
