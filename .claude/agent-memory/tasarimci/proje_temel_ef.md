---
name: proje-temel-ef
description: E+F tasarım dili kod tabanına kuruldu (Temel dalgası, 2026-11-05) — vitrin, kabuk API'si, verilen kararlar ve açık konular
metadata:
  type: project
---

2026-11-05 "Temel" dalgasında E+F dili koda döküldü: tokenlar `globals.css`, hareket `src/lib/motion.ts`, kabuk `components/layout/app-shell.tsx`, canlı referans `/vitrin` (yalnız dev). Sayfa içerikleri bir sonraki dalgada `frontend` tarafından yenilenecek.

**Why:** Kullanıcı E'yi temel, F'den hareket ve renkli ayrıntıları seçti ([[feedback-gorsel-yon]]); "mobil görünüme dikkat et, hata istemiyorum" dedi ([[feedback-mobil-tek-satir]]).

**How to apply:**
- Sayfa eylemleri sayfada değil araç çubuğunda: `PageHeader` `primary`/`secondary`/`search` → portal. Eski `children` hâlâ başlığın sağında çalışır; mobil "+" yalnız `primary` ile gelir.
- Benim kararım (kullanıcıya soruldu): komut paletindeki adlar "Yeni randevu / Yeni müşteri / Ödeme al / Yeni lead" (sayfalarla aynı); taslak "Randevu oluştur / Müşteri ekle" diyordu. Kullanıcı seçerse bu notu güncelle.
- Tuzaklar: "use client" dosyasından sabit export sunucuda değer olmaz (çerez adları `shell-cookies.ts`'te); `@layer components` kuralları Tailwind yardımcılarına yenilir (geçersiz kılmalar utilities katmanında); tailwind-merge özel `text-*` boyutlarını tanısın diye `cn` genişletildi.
- `/randevu-linki` hidrasyon uyuşmazlığı sayfanın kendi `typeof window` dalından (bizden önce de vardı).
- 2026-11-06 "ortak parçalar" dalgası: sayfa uzmanlarının yerel yazdığı Switch, FormSheet, "Gelişmiş" açılır bölüm ortaklaştı (ui/switch, shared/form-sheet, ui/disclosure); TrendChart, PageHeader `leading`, DataTable `mobileInset`/`mobileSwipe`, AppointmentBlock `highlight` eklendi. Alt sayfada (Sheet bottom) orta kademede panelin altı ekran dışında kalıyordu ve içerik sığınca kaydırılamıyordu → alttaki düğmeler erişilemezdi; gizli kısım kadar boşluk eklendi, ilk kaydırma tam boya açar. Kapsam dışı kalan yerel kopyalar (ayarlar Switch'i, musteriler/customer-create-form Collapsible, firsatlar FormSheet içe aktarması) şefe raporlandı; düzelince bu satırı kısalt.
