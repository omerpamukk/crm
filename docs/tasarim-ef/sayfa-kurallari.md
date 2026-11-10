# Sayfa dalgası kuralları (E+F)

Bu dosya, sayfaları yeni tasarıma taşıyan her uzmanın ortak brifidir. Şef
her işe ayrıca sayfaya özel bir brif verir; ikisi çelişirse sayfa brifi
geçerlidir.

## 1. Önce oku

- `CLAUDE.md`: "Ürün ilkesi: kafa karışıklığı yok", "Modül deseni",
  "Tasarım dili (güncel)" bölümleri. İlke, diğer her kuraldan önce gelir.
- Canlı bileşen vitrini: http://localhost:3000/vitrin. Kaynağı:
  `src/app/(dashboard)/vitrin/`. Kullanacağın her bileşenin kaynak
  dosyasını da aç; API'yi tahmin etme.
- Taslak: `docs/tasarim-ef/ef.html|css|js`. Canlı hâli:
  http://127.0.0.1:8767/ef.html (ekran görüntüleri `docs/tasarim-ef/ekran/`).
  Taslak yalnızca Genel Bakış ve Müşteriler'i çizer; diğer sayfalarda aynı
  dili ve aynı desenleri uygula.

## 2. Sayfa iskeleti (her sayfada aynı)

- `PageHeader`: eyebrow, başlık, açıklama ve `context` (dönem segmenti
  gibi). Eylemler sayfada değil, araç çubuğunda durur: `search`,
  `secondary` ve **tek** `primary` (`<ToolbarAction prominent …/>`).
  Telefonda birincil eylem sağ üstteki cam "+" olur. Eski `children`
  eylemlerini kaldırıp bu prop'lara taşı.
- Liste ekranı sırası: PageHeader → MetricStrip (varsa) → FilterBar →
  DataTable. Gruplu içerik `ListGroup` + `ListRow` ile yapılır.
- Formlar `Sheet side="auto"` içinde açılır (telefonda alt sayfa,
  masaüstünde sağ panel). Form yerleşimi her yerde aynıdır.
- Geri alınabilen eylemden sonra `toastUndo(...)` gösterilir. Geri
  alınamayan eylem önce `Dialog` ile onay ister.
- Her sayfada: `loading.tsx` iskeleti (`PageSkeleton`, `KpiRowSkeleton`,
  `TableSkeleton`), boş durum (`EmptyState`: ne yapılacağını söyler ve
  düğmesini sunar), hata durumu (`ErrorState`, `onRetry`).
- Para `Money`; borç `tone="debt"` ile kırmızı. Paket ilerlemesi
  `PackageProgress`. Durum `StatusDot` / `StatusBadge` (yalnızca `variant`
  alır). Kişi `Avatar` (gri monogram).
- Yeni bir ortak bileşen ya da mevcut bileşende değişiklik gerekiyorsa
  `src/components/*` altına **yazma**. Raporunda iste; şef tasarımcıya
  verir. Sayfaya özel parçalar kendi klasöründe kalır.

## 3. Adlar (tek şey, tek ad)

- Eylem adları: **Yeni randevu**, **Yeni müşteri**, **Ödeme al**,
  **Yeni lead**. Menü adı = sayfa başlığı = bildirim metni (`src/lib/nav.ts`).
- Arayüzde sade Türkçe kullanılır. Teknik terim ve ham hata kodu görünmez.
- Hizmeti veren kişi her yerde **Personel**'dir (randevu, takvim, filtre,
  sütun, form, hata metni; URL parametresi `personel`). "Uzman" yalnızca rol
  adıdır ve yalnızca rol/yetki bağlamında kullanılır (kullanıcı kararı,
  5 Kasım 2026).
- Randevu durumları: Planlandı, **Geldi**, Tamamlandı, İptal edildi,
  Gelmedi (`appointmentStatusLabel` / `appointmentStatusVariant`,
  `src/lib/constants.ts`).

## 4. "Geldi" (backend hazır)

- Server action'lar: `markArrived(id)` ve `undoArrived(id)`. İkisi de
  `@/app/(dashboard)/randevular/actions` içinde ve `{ error?: string }`
  döner.
- Kural fonksiyonları (`@/lib/appointment-status`): `canMarkArrived(status)`,
  `canUndoArrived(status)`, `canChangeArrival(role, profileStaffId,
  apptStaffMemberId)`, `SLOT_HOLDING_STATUSES` (planned + arrived: saati
  dolu tutar).
- Arayüz bileşeni: `GeldiButton {arrived, onArrive, onUndo, customerName,
  size}`. Promise reddedilirse eski hâline döner. Geri alma onay istemez;
  `toastUndo` ile birlikte kullanılır.
- Geliş saati `appointments.arrived_at` alanında. "Geldi · 14:32" gibi
  gösterilir.
- Geldi seans düşmez, gelir yazmaz; bunlar "Tamamlandı"da olur.

## 5. Dosya sahipliği

- Yalnızca brifinde verilen klasörde çalış.
- `src/components/*`, `src/app/globals.css`, layout dosyaları →
  `tasarimci`.
- `supabase/*`, `src/types/database.ts`, `src/lib/supabase/*`,
  `src/lib/permissions.ts` → `backend`.
- `src/lib/nav.ts`, `CLAUDE.md` → şef.
- Başka bir dosyanın değişmesi gerekiyorsa raporunda belirt.

## 6. Veri güvenliği

- Supabase canlı ve yerel için **ortak**. Test tarayıcısı yalnızca
  **"deneme"** test firmasında açık (yönetici, "firmadasınız" bandı).
- Yazma işlemi yalnızca "deneme"de ve yalnızca geri alınabilen türde
  serbesttir (ör. Geldi → Geri al). Kayıt ekleme, düzenleme ve silme yok.
  Formları açıp doldurabilirsin ama kaydetme.
- Admin panelinde başka firmaya "Görüntüle" ya da "Yönetici olarak gir"
  kullanma.
- "Firmadasınız" bandı kaybolursa ya da `/admin`'e yönlendirilirsen tarayıcı
  denetimini bırak ve raporla.
- "deneme" firmasında örnek veri yüklü (müşteri, randevu, paket, ödeme,
  gider, stok, görev, lead). Boş durumu görmek için filtreyle boş bir
  sonuç üret; dolu hâli doğrudan gör.

## 7. Tarayıcıda doğrulama

Aynı tarayıcıyı birden çok uzman aynı anda kullanıyor. Bu yüzden:

- **Ortak sekmeyi asla gezdirme.** `browser_navigate`, `browser_click`,
  `browser_snapshot` gibi araçlar ortak sekmeyi kullanır; bunları
  kullanma. Her şeyi `browser_run_code_unsafe` ile kendi sekmende yap:
  `const p = await page.context().newPage(); … await p.close();`.
- **Hazır tarayıcı:** `docs/tasarim-ef/tara.js`. Kopyasını
  `.playwright-mcp/tara-<adın>.js` olarak kaydet, AYARLAR'ı (SAYFALAR,
  ONEK) değiştir ve şöyle çalıştır:
  `browser_run_code_unsafe { filename: ".playwright-mcp/tara-<adın>.js" }`.
  - Genişlikler: 375, 390, 430, 768, 1024, 1440. Temalar: açık ve koyu.
  - Dönen sonuç: iki satıra kırılan etiketler, yatay taşma, JS hataları.
    Ekran görüntüleri `.playwright-mcp/ekran/` altına yazılır.
- Ekran görüntülerine `Read` ile **bak**. Tarayıcı üst üste binmeyi,
  kesilen yazıyı ve hizasızlığı yakalamaz; bunları gözle kontrol et.
- Tıklama, sürükleme ve form gibi etkileşimleri de kendi sekmende
  (`p.click`, `p.mouse`, `p.touchscreen`) dene. Telefon taklidi için
  `page.context().newCDPSession(p)` ile
  `Emulation.setDeviceMetricsOverride` kullan. `--window-size` gerçek
  375 vermiyor.
- **Temayı kullanıcı menüsünden değiştirme.** localStorage ortaktır.
  Tema için `p.emulateMedia({ colorScheme })` kullan.

## 8. Kabul kriterleri (hepsi şart)

- Kullanıcının açık isteği: "mobil görünüme dikkat et, hata istemiyorum."
  375, 390, 430, 768, 1024 ve 1440 genişliklerde, açık ve koyu temada şunlar
  **sıfır** olmalı:
  - iki satıra kırılan etiket, düğme, rozet ya da KPI başlığı;
  - yatay taşma;
  - üst üste binme;
  - JS hatası.
- Boş, yükleniyor ve hata durumlarının hepsi var.
- Klavyeyle kullanılabilir; odak halkası görünür.
- Rol davranışı doğru: `can()` / `requireCapability()`. Rolün yapamadığı
  şey o role gösterilmez.
- Koyu tema ve hareket azaltma çalışır.
- Kafa karışıklığı testi: ekranı ilk kez gören biri ne yapacağını bilir mi?

## 9. Kalite kapısı

- `npm run typecheck`, `npm run lint` (dokunduğun dosyalarda uyarı
  bırakma), `npm test`. Başarısız olanı olduğu gibi raporla.
- `npm run build`'i şef çalıştırır. Paralel derleme dev sunucusunu
  yavaşlatır, sen çalıştırma.
- Dev sunucusu :3000'de çalışıyor (`npx next dev --webpack`). Yeniden
  başlatma; sorun varsa raporla.

## 10. Rapor (kısa, Türkçe)

- Değişen dosyalar.
- Tarayıcı sonucu: `sorunSayisi` ve önemli ekran görüntülerinin yolları.
- Açık sorular.
- Tasarımcıdan ya da backend'den istenen değişiklikler.
- Kullanıcıdan beklenen adım varsa.

## 11. Sonradan eklenen kurallar (6 Kasım 2026)

- **Grup adı başlığın üstüne yazılmaz.** `PageHeader`'a "Satış", "Büyüme",
  "Yönetim" gibi menü grubu `eyebrow`'u verme; taslakta yok.
- **Yeni ortak bileşenler** (kaynağını aç, vitrinde gör):
  `ui/switch` (`Switch`, label zorunlu), `ui/disclosure` (`Disclosure`,
  "Gelişmiş" bölümü, kapalı başlar), `shared/form-sheet` (`FormSheet` +
  `FormActions`: bütün formlar bununla açılır), `shared/trend-chart`
  (`TrendChart`, çizgi/sütun; Ciro sparkline'ının büyüğü). `PageHeader`
  `leading`, `DataTable` `mobileInset` ve `mobileSwipe`. Sayfaya özel
  Switch/Collapsible/Sheet kopyası yazma.
- **Para:** `Money` / `formatMoney` ya da `formatPrice` (ikisi de küsuratsız
  tamsayı yazar: ₺1.200).
- **Borç:** müşteri borcu yalnızca `src/lib/balances.ts`
  (`fetchCustomerBalances`, `fetchDebtors`, `summarizeBalances`) üzerinden.
  Sayfada kendi borç hesabını yazma.
- **Saat ve tarih:** yalnızca `src/lib/zaman.ts` (`BUSINESS_TZ`,
  `fromDateTimeLocal`, `toDateTimeLocal`, `zonedParts`, `zonedWallToUtcMs`,
  `isDateOnly`) ve `src/lib/format.ts`. Gün/hafta/ay aralığı için
  `randevular/date-range.ts`. Tarayıcının yerel saatine dayanan
  `new Date(y, m, d)`, `getHours()`, `toLocaleString()` (timeZone'suz) ve
  ofsetsiz ISO yazımı hata sayılır: sunucu UTC, kullanıcı İstanbul.
- **Sunucu eylemleri:** her yazma `business_id` ile sınırlı ve
  `authorize(supabase, capability)` (`src/lib/supabase/authorize.ts`) ile
  yetki denetimli; ham DB hatası kullanıcıya gitmez.
