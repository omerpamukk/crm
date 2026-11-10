// Arayüz tarayıcısı — kullanım: docs/tasarim-ef/sayfa-kurallari.md › "Tarayıcıda doğrulama".
async (page) => {
  // ── AYARLAR ──────────────────────────────────────────────────────────────
  const SAYFALAR = ["/panel"];
  const GENISLIKLER = [375, 390, 430, 768, 1024, 1440];
  const TEMALAR = ["light", "dark"];
  const ONEK = "tara";
  const EKRAN = ".playwright-mcp/ekran";
  const TAM_SAYFA = false; // true: tüm sayfanın görüntüsü (uzun sayfalarda yavaş)
  const BASE = "http://localhost:3000";
  // ─────────────────────────────────────────────────────────────────────────

  const detect = () => {
    const kirilan = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      const t = tw.currentNode;
      const txt = t.textContent.replace(/\s+/g, " ").trim();
      if (!txt || txt.length > 60) continue;
      // Tam cümleler (açıklama, boş ekran metni) alt satıra geçebilir; kural etiketler için.
      if (/[.!?…:]$/.test(txt) && txt.split(" ").length > 3) continue;
      const el = t.parentElement;
      if (!el || el.closest(".sr-only,script,style,[hidden],[data-sonner-toaster],nextjs-portal,[data-tara-yoksay]")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = document.createRange();
      r.selectNodeContents(t);
      const rects = [...r.getClientRects()].filter((x) => x.width > 1 && x.height > 1);
      if (!rects.length) continue;
      const tops = new Set(rects.map((x) => Math.round(x.top / 4)));
      if (tops.size > 1) kirilan.push(txt);
    }
    const sw = document.documentElement.scrollWidth;
    return { kirilan, tasma: sw > innerWidth + 1 ? sw : 0 };
  };

  const p = await page.context().newPage();
  p.setDefaultTimeout(120000); // dev sunucusu ilk derlemede yavaş olabilir
  const cdp = await page.context().newCDPSession(p);
  const hatalar = [];
  p.on("pageerror", (e) => hatalar.push(String(e.message).slice(0, 160)));
  p.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools/.test(m.text())) hatalar.push(m.text().slice(0, 160));
  });

  const sorunlar = {};
  const ekranlar = [];
  try {
    for (const w of GENISLIKLER) {
      const mobile = w < 768;
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: mobile ? 812 : 900, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
      for (const tema of TEMALAR) {
        await p.emulateMedia({ colorScheme: tema });
        for (const yol of SAYFALAR) {
          hatalar.length = 0;
          await p.goto(BASE + yol, { waitUntil: "domcontentloaded" });
          await p.waitForLoadState("load");
          await p.waitForTimeout(1200);
          const r = await p.evaluate(detect);
          const ad = `${EKRAN}/${ONEK}${yol.replace(/[^a-z0-9]+/gi, "_")}-${w}-${tema}.png`;
          await p.screenshot({ path: ad, fullPage: TAM_SAYFA });
          ekranlar.push(ad);
          if (r.kirilan.length || r.tasma || hatalar.length) {
            sorunlar[`${yol} · ${w} · ${tema}`] = { ...r, hatalar: [...new Set(hatalar)] };
          }
        }
      }
    }
  } finally {
    await p.close();
  }
  return { sorunSayisi: Object.keys(sorunlar).length, sorunlar, ekranlar };
}
