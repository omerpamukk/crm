---
name: proje-saat-dilimi
description: Randevu saatlerinde saat dilimi tutarsızlığı — form saf yerel saati UTC diye yazıyor; Takvim işletme diliminde (Europe/Istanbul) gösteriyor
metadata:
  type: project
---

2026-11-05'te Takvim yapılırken bulundu (şefe raporlandı, düzeltme Randevular/backend'de):
- `appointment-form.tsx` `datetime-local` değerini ("2026-06-26T15:46") dilimsiz gönderiyor; Postgres bunu UTC sayıyor. `toDateTimeLocal` de ISO'yu `slice(0,16)` ile UTC gösteriyor. Sonuç: 15:46 (İstanbul) randevu formda 12:46 görünüyor; formdan 14:00 girilen randevu takvimde 17:00 çıkar.
- Online randevu (`booking-flow.tsx`) doğru anı yazıyor (`toISOString`).
- Takvim (`takvim/zaman.ts`) ve Genel Bakış (`panel/dates.ts`) işletme diliminde gösteriyor — doğru yorum budur.

**Why:** Sunucu (Vercel) UTC, kullanıcı Türkiye'de; eski sayfalar sunucu saatine göre biçimlediği için hata canlıda gizleniyordu.

**How to apply:** Saat gösteren yeni bir ekranda tarayıcı/sunucu yerel saatine değil işletme dilimine göre biçimle. Form düzeltilmeden takvimden "boş saate tıkla → Yeni randevu" ön doldurması açılmamalı. Düzeltildiyse bu notu sil; eski kayıtların kaydırılması gerekip gerekmediği kullanıcı kararı.
