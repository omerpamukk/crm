---
name: feedback-mobil-tek-satir
description: Kalıcı kural — mobilde etiket, KPI başlığı, rozet ve "sayı + birim" grupları asla iki satıra kırılmaz; dar ekranda yerleşim esner
metadata:
  type: feedback
---

Mobilde (375px) hiçbir etiket, KPI başlığı, rozet veya "sayı + birim" grubu iki satıra kırılmaz. Rozet ile yanındaki açıklama aynı satırda kalır.

**Why:** Kullanıcı 2026-11-05'te mobil taslakta "Bu ay yeni / müşteri" ve "3 gecikmiş · 9 / müşteri" kırılmalarını görüp "mobilde böyle alt alta gelen yazılar istemiyorum, bu düzensizliğe dikkat etsin" dedi; tasarımcı, denetçi ve kaliteci için kalıcı kural.

**How to apply:**
- Önce yerleşimi değiştir: 2×2 KPI kartları yerine tek sütunlu kompakt satır (etiket solda `truncate`, trend + değer sağda `whitespace-nowrap`), ya da yatay kayan şerit.
- Sonra etiketi kısalt; son çare `truncate` + `title`.
- Izgaralarda taban `grid-cols-1` (minmax(0,1fr)) kullan; yoksa kırılmayan metin sütunu genişletip yatay taşma yapar.
- Bitirmeden mobil görünümü otomatik tara: her kısa metin düğümü için Range.getClientRects() birden fazla satır veriyorsa kırılmıştır. Bkz. [[proje-playwright-ortami]].
