---
name: feedback-gorsel-yon
description: Kullanıcının görsel yön tercihleri — sade reddedildi, Untitled UI beğenildi; kaynağa dayalı yönde proje stil yasaklarıyla kendini sınırlama (yalnız metin kırılmaz + kafa karışıklığı yok bağlayıcı)
metadata:
  type: feedback
---

Sade/sakin yöne dönmek seçenek değil. "Sakin & Profesyonel" reddedildi, Eylül 2026'daki "Ferah & Modern SaaS" de "yeterince ileri değil" bulundu (Kasım 2026).
Kasım 2026'da kullanıcı yön sinyali olarak Untitled UI tarzı bir "Customers" ekranı gönderdi: beyaz zemin, ikon kutusuz büyük KPI + trend çipi, alt çizgili sekmeler, kaldırılabilir filtre çipleri, iki satırlı hücreli tablo + sayfalama, 6+3 öğeli bölümsüz menü.

**Why:** Kullanıcı ürünü rakip CRM/randevu yazılımlarından daha modern ve toparlı görmek istiyor; referansı birebir kopya değil, "yapısını al, üstüne koy, geliştir" diye istiyor.

**How to apply:**
- Yön önerilerinden biri bu referansı temel almalı, diğerleri ondan bir adım ileri gitmeli.
- Birbirinden ayrı araçları tek sayfada sekmelerle birleştirme önerme; yalnızca "aynı verinin farklı görünümleri" birleşebilir (ör. Takvim + Randevular). Diğerleri için kaldır/gizle/taşı.
- Menü sadeleştirmesi kullanıcı için öncelikli bir şikâyet ("çok fazla menü, düzensizlik, gereksiz araçlar").
- İlgili: [[proje-dev-sunucu-disk]]
- 2026-11-05: Untitled UI sinyaline göre üç yön (A net, B ön büro, C markalı) taslağı hazırlandı; kullanıcı karar veremedi. Aynı gün apple-design skill'iyle D (Apple yerlisi: gri zemin + kenarlıksız beyaz gruplar, kapsül kontroller, "Sıradaki" kartı, mobilde yüzen cam sekme çubuğu) ve şefçe E eklendi. D sonra proje stil yasakları kaldırılarak skill'e göre yenilendi (cam kenar/araç/sekme çubuğu, marka ışığı içerikte); bkz. [[feedback-skill-tam-uygula]]. Kararı öğrenince bu notu güncelle.
- E'nin şartı: hazır skill kullanılmadan, yalnızca developer.apple.com HIG sayfalarından (kullanıcının açık isteği; D'nin dosyalarına ve skill'e bakılmadı). E: Mac tarzı kenar çubuğu + arka plansız araç çubuğu + Müşteriler'de bölünmüş görünüm (vurgulu seçili satır, sağda Kişiler tarzı ayrıntı), Indigo vurgu yalnızca tıklanabilirde, metinde Apple'ın "increased contrast" renkleri.
- 2026-11-05 düzeltme (kullanıcının sözü): "ben bir sınır istemedim, isteğim sadece apple kaynağını kullanarak nasıl bir tasarım göreceğimizdi". CLAUDE.md'deki görsel yasaklar (cam, gradient, renkli ikon kutusu, kart içinde kart, sabit hex) Eylül'de bizim seçtiğimiz stilden kalma; kullanıcının isteği değil. Bir kaynağa dayalı yön istenince o kaynağı tam uygula; yalnızca "metin kırılmaz" ve "kafa karışıklığı yok" kullanıcının kendi bağlayıcı kuralları. E v2 buna göre Liquid Glass ile yeniden yapıldı.
- 2026-11-05 KARAR: Kullanıcı temel olarak E'yi seçti; F'den (Emil Kowalski hareket skill'i) yay/sürükle-fırlat/Geldi anı hareketini, Ciro çizgi grafiğini, renkli yüzde haplarını, zemindeki hafif renkli ışığı, yeşil Geldi'yi, durum noktalarını ve kırmızı borç tutarlarını istedi. F'nin mavi vurgusunu ve renkli avatarlarını SEÇMEDİ (Indigo + gri monogram kalır). "Bugünün programı"nda Liste | Çizelge ikisi de olsun, varsayılan Liste. Birleşik taslak: yonler/ef.*. Ürüne aktarılırken bu birleşimi esas al.
- 2026-11-05: F eklendi — Emil Kowalski'nin `apple-design-emil` skill'iyle (hareket ağırlıklı). Farkı görselden çok etkileşim: kendi yay fonksiyonu (sönüm/tepki), kesilebilir geçişler, 1:1 sürükleme + ivme yansıtması + lastik bant (zaman çizelgesi, segment başparmağı, alt sayfa, inceleme paneli, kaydırarak Geldi). Görsel: ortam gradyanı üstünde opak kartlar, saydam malzeme yalnızca işlev katmanında. Kararı öğrenince bu notu güncelle.
- 2026-11-06: Kullanıcı Genel Bakış'taki Ciro sparkline'ını (Indigo çizgi, altta solan dolgu, son noktada halkalı nokta) "çok beğendi". Satışlar'daki eski aylık grafik kaldırılmıştı; yerine bu dilin büyüğü `TrendChart` yapıldı. Yeni grafiklerde bu görünümü esas al; recharts'ın varsayılan görünümüne dönme.
