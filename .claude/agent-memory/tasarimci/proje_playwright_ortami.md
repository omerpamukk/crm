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
