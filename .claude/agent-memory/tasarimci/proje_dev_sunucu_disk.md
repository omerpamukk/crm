---
name: proje-dev-sunucu-disk
description: Diskin %97 dolu olduğu makinede dev sunucusu ENOSPC ile çöküp her isteğe 500 dönüyor; tarayıcı denetimi için yan yol
metadata:
  type: project
---

2026-11-05 keşif sırasında `next dev --webpack` (port 3000) sayfa derlerken `ENOSPC: no space left on device` aldı ve sonra her rotaya 4 ms'de "Internal Server Error" döndü. Disk ~7 GB boş, %97 dolu; `.next/dev` ~585 MB. Sunucu yeniden başlatılmadan düzelmiyor (log: `.next/dev/logs/next-development.log`).

**Why:** Şef sunucuyu durdurmamı/yeniden başlatmamı yasaklamıştı; denetimi bitirmek için yan yol gerekti.

**How to apply:** Ekran görüntüsü alırken 500 görürsen önce bu logu kontrol et ve şefe bildir — şef sunucuyu temiz önbellekle yeniden başlatır (dolu diskte ek build almak riskli). Şef ulaşılamazsa son çare yan yol: `npx next build --webpack` + `npx next start -p 3100` (Next 16'da build ile dev ayrı klasör kullanır; localhost çerezleri portlar arası paylaşıldığı için oturum ve "Görüntüle" modu taşınır). İş bitince sunucuyu durdur ve `.next` altında `dev` dışındaki build çıktısını sil (~460 MB). Playwright MCP ekran görüntülerini yalnızca proje içine (`.playwright-mcp/`) yazabiliyor; sonra scratchpad'e taşı.

- 2026-11-05 akşam (Takvim dalgası): disk %100'e (317 MB boş) dayandı, sonra 4–6 GB'a açıldı; birden çok ajan aynı anda derlerken `/giris` 47 sn sürdü ama ENOSPC görülmedi. Tarama betiklerinde `goto` zaman aşımını 180 sn yap, sayfayı genişlik başına bir kez yükleyip görünüm/temayı istemcide değiştir.
