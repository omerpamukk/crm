---
name: proje-playwright-ortami
description: Playwright MCP tuzakları — file:// engelli, kullanıcı aynı pencereyi %90 yakınlaştırmayla izliyor (fare koordinatları kayar), aynı URL'ye gitmek yeniden yüklemez
metadata:
  type: project
---

Kasım 2026'da gözlenen Playwright MCP ortamı:
- `file://` adresleri engelli. Scratchpad'deki HTML taslakları için `python3 -m http.server` yerine `Cache-Control: no-store` gönderen küçük bir sunucu kullan (yoksa tarayıcı eski JS/CSS'i önbellekten verir).
- Kullanıcı Playwright penceresini kendisi izliyor ve %90 yakınlaştırmada (devicePixelRatio 1,8). Bu yüzden `browser_click` / `page.mouse.click` yanlış noktaya düşüyor (olay hedefi `<html>`), tıklama "performing click action"da asılı kalıyor. Etkileşimi `element.click()` ile JS'ten yap. 1440×900 CSS görünüm için viewport'u 1296×810 ayarla.
- Yalnızca hash'i farklı aynı URL'ye `navigate` sayfayı yeniden yüklemez; her seferinde `?v=N` ekle.
- Mobil kontrolü 375px'lik iframe içinde yap (yakınlaştırmadan etkilenmez); masaüstü kaydırma çubuğu 17px yer, mobil taslakta `@media (max-width:480px)` ile gizle.

**Why:** Bu tuzaklar yanlış "hata var" sonucuna ve zaman kaybına yol açtı.

**How to apply:** Tarayıcıyla doğrulamaya başlamadan önce `innerWidth/devicePixelRatio` oku; iş bitince sekmeyi şefin istediği adrese geri götür. İlgili: [[proje-dev-sunucu-disk]], [[feedback-mobil-tek-satir]].
- Playwright yerine arka plan Chrome istendiğinde: `--headless=new --window-size=375,812` gerçek 375 vermez (ölçüldü: innerWidth 500 × 725; görüntü kırpılır, sahte taşma görünür). CDP ile `Emulation.setDeviceMetricsOverride` (width 375, mobile true) kullan; Node 24'te global WebSocket var, ek paket gerekmez.
- Jest testi (sheet/kaydırma) için CDP'de `Emulation.setTouchEmulationEnabled` + `Input.dispatchTouchEvent` adımları gerçek pointer olayı üretir; hız için adımlar arası ms ver. Enter tuşu için `dispatchKeyEvent`'e `text: "\r"` ekle, yoksa düğme tıklanmaz. `postMessage` sözleşmesini data: URL sayfasından dinlemek çalışmadı; küçük harness'i ayrı portta http ile sun.
- **En iyi yol (2026-11-05, Temel dalgası):** `browser_run_code_unsafe` içinde `page.context().browser().newContext({ storageState: await page.context().storageState(), viewport, isMobile, hasTouch, colorScheme, reducedMotion })` — oturum taşınır, gerçek 375/390/430 verir, ana sekmeye dokunmaz (MCP tarayıcısını başka ajanlar da kullanıyor; ana sekme kendiliğinden başka sayfaya gidebiliyor). Ekran görüntüsü scratchpad'e yazılabiliyor. `require` yok; ayarı dosyaya gömüp `filename` ile çalıştır. Dokunma kaydırması için `ctx.newCDPSession(p)` + `Input.dispatchTouchEvent`. Şeffaflık/kontrast için CDP `Emulation.setEmulatedMedia` features.
- Taşma taraması: `main` artık `overflow-x-clip`; belge genişliği kontrolü yetmez, ebeveyninden taşan (overflow visible) öğeleri ayrıca tara. `sr-only` mutlak öğeler kaydırma kabının dışına taşıp belgeyi genişletebiliyor.
- **2026-11-05 Takvim dalgası tuzakları:** (1) `SegmentedControl` düğmesinin `textContent`'i kalın kopya yüzünden iki kez yazar ("HaftaHafta") — eşleştirmede `startsWith` kullan. (2) Arka plandaki yeni context sekmesinde `waitForFunction` varsayılan `raf` yoklaması hiç dönmüyor; `polling: 500` ya da sabit bekleme kullan. (3) CDP dokunma kaydırması, parmağın altında `overflow:auto` bir kap varsa ilk `pointermove`'dan sonra `pointercancel` alır (touch-action en yakın kaydırma kabında hesaplanır) — jest testi yapmadan önce bunu kontrol et. (4) Yavaş sunucuda tıklamayı hydration'dan önce yapma (6 sn bekle).
