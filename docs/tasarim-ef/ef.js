/* ==========================================================================
   Yön E+F — E'nin düzeni (Apple HIG, Liquid Glass) + F'nin hareket hissi
   (yay, kesilebilir geçiş, sürükle-fırlat, Geldi anı) ve seçilen renkler.
   Veri ortak.js'teki örnekle aynı (karşılaştırma adil olsun diye kopyalandı).
   ========================================================================== */
(() => {
  "use strict";

  /* ---------------- Tema: sistem görünümünü izler (HIG › Dark Mode) · doğrulama için ?tema=koyu | ?tema=acik ---------------- */
  const qs = new URLSearchParams(location.search);
  const temaQ = qs.get("tema");
  const darkMq = matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = () => {
    const dark = temaQ === "koyu" || (temaQ !== "acik" && darkMq.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  };
  applyTheme();
  if (qs.get("cam") === "yok") document.documentElement.classList.add("no-blur");
  darkMq.addEventListener && darkMq.addEventListener("change", applyTheme);

  /* ---------------- Yardımcılar ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const tl = (n) => "₺" + Math.round(n).toLocaleString("tr-TR");
  const nf = (n) => n.toLocaleString("tr-TR");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const up = (s) => s.toLocaleUpperCase("tr");
  const initials = (ad) => up(ad.split(/\s+/).map((s) => s[0]).slice(0, 2).join(""));
  const ic = (n, cls = "") => `<i data-lucide="${n}" class="ic ${cls}" aria-hidden="true"></i>`;
  const mono = (ad, cls = "") => `<span class="mono ${cls}" aria-hidden="true">${initials(ad)}</span>`;
  const icons = () => window.lucide && lucide.createIcons({ attrs: { "stroke-width": 1.9 } });
  const isPhone = () => innerWidth < 768;
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const delta = (d) =>
    d == null ? "" : `<span class="delta ${d >= 0 ? "up" : "down"}">${ic(d >= 0 ? "arrow-up" : "arrow-down")}%${Math.abs(d)}<span class="sr">${d >= 0 ? " artış" : " azalış"}</span></span>`;


  /* ======================================================================
     Hareket — F'den uyarlandı: yay (sönüm + tepki), hız izleyici,
     ivme yansıtması, lastik bant, eşikli sürükleme. Her animasyon ekrandaki
     anlık değerden ve hızdan devam eder; her an yakalanıp tersine çevrilebilir.
     ====================================================================== */
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => mqReduce.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const haptic = (e, ms = 10) => { try { if (e && e.pointerType === "touch" && navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(ms); } catch (err) { /* yok say */ } };

  const Motion = (() => {
    const active = new Set();
    let raf = 0, last = 0;
    const loop = (t) => {
      const dt = clamp((t - last) / 1000, 0.001, 0.05);
      last = t;
      for (const s of [...active]) s._step(dt);
      raf = active.size ? requestAnimationFrame(loop) : 0;
    };
    const wake = (s) => { active.add(s); if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    class Spring {
      constructor(value = 0, o = {}) {
        this.x = value; this.v = 0; this.target = value;
        this.response = o.response ?? 0.35; this.damping = o.damping ?? 1;
        this.precision = o.precision ?? 0.1;
        this.onUpdate = o.onUpdate || (() => {});
        this.onRest = null;
      }
      get running() { return active.has(this); }
      to(target, o = {}) {
        this.target = target;
        if (o.velocity !== undefined) this.v = clamp(o.velocity, -5000, 5000);
        if (o.response) this.response = o.response;
        if (o.damping !== undefined) this.damping = o.damping;
        this.onRest = o.onRest || null;
        if (o.instant || reduced()) { const r = this.onRest; this.onRest = null; this.jump(target); r && r(); return this; }
        wake(this);
        return this;
      }
      jump(v) { active.delete(this); this.x = v; this.v = 0; this.target = v; this.onUpdate(v, 0); return this; }
      stop() { active.delete(this); return this; }
      _step(dt) {
        const w = (2 * Math.PI) / this.response, k = w * w, c = 2 * this.damping * w;
        const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
        for (let i = 0; i < n; i++) { const a = -k * (this.x - this.target) - c * this.v; this.v += a * h; this.x += this.v * h; }
        if (Math.abs(this.v) < this.precision * 10 && Math.abs(this.x - this.target) < this.precision) {
          this.x = this.target; this.v = 0; active.delete(this); this.onUpdate(this.x, 0);
          const r = this.onRest; this.onRest = null; r && r();
          return;
        }
        this.onUpdate(this.x, this.v);
      }
    }
    function tracker() {
      let pts = [];
      return {
        reset() { pts = []; },
        add(x) { const t = performance.now(); pts.push([x, t]); while (pts.length > 2 && t - pts[0][1] > 100) pts.shift(); },
        v() {
          if (pts.length < 2) return 0;
          const [x1, t1] = pts[pts.length - 1];
          if (performance.now() - t1 > 80) return 0;
          const [x0, t0] = pts[0], dt = (t1 - t0) / 1000;
          return dt > 0.004 ? (x1 - x0) / dt : 0;
        },
      };
    }
    const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d);
    const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
    const nearest = (list, x) => list.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    function easing(response, damping) {
      const w = (2 * Math.PI) / response, k = w * w, c = 2 * damping * w, dt = 1 / 240;
      let x = 0, v = 0, t = 0;
      const vals = [0];
      while (t < 2) {
        for (let i = 0; i < 4; i++) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; }
        t += 4 * dt; vals.push(x);
        if (Math.abs(1 - x) < 0.0015 && Math.abs(v) < 0.02) break;
      }
      const n = 36, out = [];
      for (let i = 0; i <= n; i++) out.push(+vals[Math.round((i / n) * (vals.length - 1))].toFixed(4));
      out[n] = 1;
      return { css: `linear(${out.join(", ")})`, ms: Math.round(t * 1000) };
    }
    return { Spring, tracker, project, rubber, nearest, easing };
  })();
  const { Spring, project, rubber, nearest } = Motion;
  /* CSS geçişleri için aynı yaydan üretilmiş eğri (kenar çubuğu, düğme, renk geçişleri) */
  const SPRING = (() => {
    const e = Motion.easing(0.4, 1);
    const ok = window.CSS && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)");
    if (ok) { document.documentElement.style.setProperty("--spring", e.css); document.documentElement.style.setProperty("--spring-dur", e.ms + "ms"); }
    return { css: ok ? e.css : "cubic-bezier(0.2, 0.8, 0.2, 1)", ms: ok ? e.ms : 420 };
  })();
  /* Hareket azaltılmışsa kayma yerine kısa yumuşak geçiş */
  const fade = (el, inOut, done) => {
    const a = el.animate(inOut ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: inOut ? 180 : 150, easing: "ease-out", fill: "forwards" });
    if (done) a.onfinish = done;
    return a;
  };

  /* Eşik (histerezis) sonrası 1:1 takip; niyet başka eksene giderse bu jest kaybeder */
  function drag(el, o) {
    const tr = Motion.tracker();
    let id = null, sx = 0, sy = 0, started = false, lastV = 0;
    const axis = o.axis || "x", th = o.threshold ?? 8;
    const swallowNextClick = () => {
      const sw = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", sw, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", sw, { capture: true }), 0);
    };
    const move = (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const main = axis === "y" ? dy : dx, cross = axis === "y" ? dx : dy;
      if (!started) {
        if (Math.abs(main) > th && Math.abs(main) > Math.abs(cross)) {
          if (o.canDir && !o.canDir(main)) { end(e, true); return; }
          started = true;
          try { el.setPointerCapture(id); } catch (err) { /* yok say */ }
          o.onStart && o.onStart(e);
        } else if (Math.abs(cross) > th) { end(e, true); return; }
        else return;
      }
      lastV = main; tr.add(main);
      o.onMove(main, e);
      if (e.cancelable) e.preventDefault();
    };
    const end = (e, abandon) => {
      if (e.pointerId !== id) return;
      id = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!started || abandon) { started = false; o.onCancel && o.onCancel(); return; }
      started = false;
      const v = e.type === "pointercancel" ? 0 : tr.v();
      o.onEnd(lastV, v, e);
      if (e.type === "pointerup") swallowNextClick();
    };
    const up = (e) => end(e, false);
    el.addEventListener("pointerdown", (e) => {
      if ((e.pointerType === "mouse" && e.button !== 0) || id !== null) return;
      if (o.canStart && !o.canStart(e)) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; started = false; lastV = 0; tr.reset(); tr.add(0);
      o.onDown && o.onDown(e);
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  }

  /* Segment denetimi: dokun → yay; başparmağı sürükle → 1:1, sınırda lastik, bırakınca yansıt */
  function segmented(el, onChange) {
    if (!el || el._seg) return el && el._seg;
    const btns = $$("button", el), thumb = el.querySelector(".seg-thumb");
    let idx = Math.max(0, btns.findIndex((b) => b.getAttribute("aria-checked") === "true"));
    const pos = () => btns.map((b) => b.offsetLeft);
    /* Başparmak seçili düğmenin genişliğini izler: etiketler eşit uzunlukta değil (Liste / Çizelge) */
    const w = new Spring(0, { precision: 0.1, onUpdate: (v) => { thumb.style.width = `${v}px`; } });
    const fit = () => w.jump(btns[idx].offsetWidth);
    fit();
    const x = new Spring(0, { precision: 0.1, onUpdate: (v) => { thumb.style.transform = `translateX(${v}px)`; } });
    x.jump(pos()[idx]);
    const nearIdx = (t) => { const p = pos(); return p.indexOf(nearest(p, t)); };
    function select(i, { velocity = 0, focus } = {}) {
      i = clamp(i, 0, btns.length - 1);
      btns.forEach((b, k) => { b.setAttribute("aria-checked", String(k === i)); b.tabIndex = k === i ? 0 : -1; b.classList.remove("is-hover"); });
      x.to(pos()[i], { velocity, response: 0.3, damping: Math.abs(velocity) > 500 ? 0.8 : 1 });
      w.to(btns[i].offsetWidth, { response: 0.3, damping: 1 });
      focus && btns[i].focus();
      if (i !== idx) { const from = idx; idx = i; onChange(btns[i].dataset.k, i, from); }
    }
    btns.forEach((b, i) => { b.tabIndex = i === idx ? 0 : -1; b.addEventListener("click", () => select(i)); });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault(); select(idx + (e.key === "ArrowRight" ? 1 : -1), { focus: true });
    });
    let base = 0;
    drag(el, {
      axis: "x", threshold: 3,
      canStart: (e) => { const r = thumb.getBoundingClientRect(); return e.clientX >= r.left - 4 && e.clientX <= r.right + 4; },
      onStart: () => { x.stop(); base = x.x; el.classList.add("is-dragging"); },
      onMove: (d) => {
        const p = pos(), min = p[0], max = p[p.length - 1], w = btns[0].offsetWidth;
        let t = base + d;
        if (t < min) t = min + rubber(t - min, w);
        if (t > max) t = max + rubber(t - max, w);
        x.jump(t);
      },
      onEnd: (d, v) => { el.classList.remove("is-dragging"); select(nearIdx(x.x + project(v, 0.99)), { velocity: v }); },
      onCancel: () => el.classList.remove("is-dragging"),
    });
    el._seg = { relayout() { fit(); x.jump(pos()[idx]); }, select };
    return el._seg;
  }
  const segHtml = (label, opts, cur, cls = "") => `<div class="seg ${cls}" role="radiogroup" aria-label="${label}"><span class="seg-thumb" aria-hidden="true"></span>${opts.map((o) => `<button type="button" role="radio" aria-checked="${o.k === cur}" data-k="${o.k}">${o.l}${o.n != null ? `<span class="n">${nf(o.n)}</span>` : ""}</button>`).join("")}</div>`;

  /* Kaydırarak işlem (telefon): yatay niyet netleşince 1:1; tam kaydırma işlemi yapar */
  let openSwipe = null;
  function bindSwipe(li, { lead, trailW, onFull }) {
    if (li._sw) return;
    const c = li.querySelector(".sw-c"), leadEl = li.querySelector(".sw-acts.lead");
    const W = () => li.clientWidth;
    let armed = false, base = 0;
    const x = new Spring(0, { precision: 0.3, onUpdate: (v) => {
      c.style.transform = v ? `translateX(${v}px)` : "";
      li.classList.toggle("is-sw", Math.abs(v) > 0.5);
      if (leadEl) leadEl.style.width = Math.max(0, v) + "px";
    } });
    const api = { close: () => x.to(0, { response: 0.3 }), get open() { return Math.abs(x.target) > 1; } };
    li._sw = api;
    drag(li, {
      axis: "x", threshold: 10,
      onStart: () => { if (openSwipe && openSwipe !== api) openSwipe.close(); openSwipe = api; x.stop(); base = x.x; },
      onMove: (d, e) => {
        let t = base + d;
        if (t > 0 && !lead) t = rubber(t, W());
        const minX = trailW ? -trailW : 0;
        if (t < minX) t = minX + rubber(t - minX, W());
        x.jump(t);
        if (lead && leadEl) {
          const a = t > W() * 0.5;
          if (a !== armed) { armed = a; const sa = leadEl.querySelector(".sa"); sa && sa.classList.toggle("armed", a); haptic(e, 8); }
        }
      },
      onEnd: (d, v, e) => {
        if (lead && armed) {
          armed = false;
          x.to(W(), { velocity: v, response: 0.28, damping: 1, onRest: () => { onFull && onFull(e); } });
          return;
        }
        const snaps = [0]; if (lead) snaps.push(lead); if (trailW) snaps.push(-trailW);
        x.to(nearest(snaps, x.x + project(v, 0.99)), { velocity: v, response: 0.32, damping: 1 });
      },
    });
    c.addEventListener("click", (e) => { if (api.open) { e.stopPropagation(); e.preventDefault(); api.close(); } }, true);
  }

  /* ---------------- Veri ---------------- */
  const PERSONEL = [
    { id: "merve", ad: "Merve Aydın" }, { id: "selin", ad: "Selin Çetin" },
    { id: "burak", ad: "Burak Demir" }, { id: "elif", ad: "Elif Kaya" },
  ];
  const MUSTERI = [
    { id: "zeynep", iletisimGun: 1, ad: "Zeynep Arslan", tel: "0532 418 27 63", eposta: "zeynep.arslan@gmail.com", hizmet: "Cilt Bakımı", toplam: 10, kalan: 4, sira: { gun: "Bugün", saat: "10:30", uzman: "Merve" }, iletisim: { ne: "Dün", tur: "Mesaj" }, deger: 14500, borc: 2000, gecikmis: false, durum: "active", etiket: ["VIP"], randevu: 14, sonZiyaret: "29 Eki", sonZiyaretGun: 7 },
    { id: "ayse", iletisimGun: 3, ad: "Ayşe Yıldız", tel: "0541 237 90 12", eposta: "ayseyildiz@hotmail.com", hizmet: "Lazer Epilasyon", toplam: 8, kalan: 1, sira: { gun: "7 Kas Cmt", saat: "14:00", uzman: "Selin" }, iletisim: { ne: "3 gün önce", tur: "Arama" }, deger: 9600, borc: 0, durum: "active", etiket: [], randevu: 9, sonZiyaret: "24 Eki", sonZiyaretGun: 12 },
    { id: "mehmet", iletisimGun: 14, ad: "Mehmet Öztürk", tel: "0505 611 44 08", eposta: "mehmet.ozturk@outlook.com", hizmet: "Medikal Masaj", toplam: 6, kalan: 0, sira: null, iletisim: { ne: "2 hafta önce", tur: "Seans" }, deger: 7200, borc: 0, durum: "active", etiket: [], randevu: 6, sonZiyaret: "22 Eki", sonZiyaretGun: 14 },
    { id: "derya", iletisimGun: 0, ad: "Derya Koç", tel: "0533 902 15 47", eposta: "deryakoc@gmail.com", hizmet: "Reformer Pilates", toplam: 12, kalan: 9, sira: { gun: "Bugün", saat: "17:00", uzman: "Elif" }, iletisim: { ne: "Bugün", tur: "Randevu" }, deger: 6000, borc: 3000, gecikmis: true, durum: "active", etiket: ["Taksitli"], randevu: 4, sonZiyaret: "3 Kas", sonZiyaretGun: 2 },
    { id: "can", iletisimGun: 7, ad: "Can Aksoy", tel: "0544 380 72 19", eposta: "can.aksoy@gmail.com", hizmet: "Diyetisyen Görüşmesi", toplam: null, kalan: null, sira: { gun: "12 Kas Per", saat: "11:30", uzman: "Elif" }, iletisim: { ne: "1 hafta önce", tur: "Not" }, deger: 1800, borc: 0, durum: "new", etiket: [], randevu: 1, sonZiyaret: "29 Eki", sonZiyaretGun: 7 },
    { id: "gizem", iletisimGun: 4, ad: "Gizem Polat", tel: "0538 274 66 31", eposta: "gizempolat@icloud.com", hizmet: "Hydrafacial", toplam: 4, kalan: 2, sira: { gun: "9 Kas Pzt", saat: "15:30", uzman: "Merve" }, iletisim: { ne: "4 gün önce", tur: "Mesaj" }, deger: 8800, borc: 0, durum: "active", etiket: ["VIP"], randevu: 7, sonZiyaret: "27 Eki", sonZiyaretGun: 9 },
    { id: "burcu", iletisimGun: 60, ad: "Burcu Erdem", tel: "0507 155 83 90", eposta: "burcuerdem@gmail.com", hizmet: "Kalıcı Makyaj", toplam: null, kalan: null, sira: null, iletisim: { ne: "2 ay önce", tur: "Seans" }, deger: 4500, borc: 0, durum: "active", etiket: [], randevu: 2, sonZiyaret: "29 Ağu", sonZiyaretGun: 68 },
    { id: "hakan", iletisimGun: 1, ad: "Hakan Tunç", tel: "0532 640 18 25", eposta: "hakantunc@gmail.com", hizmet: "Medikal Masaj", toplam: 6, kalan: 5, sira: { gun: "Yarın", saat: "18:00", uzman: "Burak" }, iletisim: { ne: "Dün", tur: "Randevu" }, deger: 3000, borc: 4200, gecikmis: false, durum: "new", etiket: [], randevu: 1, sonZiyaret: "2 Kas", sonZiyaretGun: 3 },
    { id: "nazli", iletisimGun: 5, ad: "Nazlı Güneş", tel: "0546 713 29 04", eposta: "nazligunes@gmail.com", hizmet: "Lazer Epilasyon", toplam: 8, kalan: 4, sira: { gun: "14 Kas Cmt", saat: "13:00", uzman: "Selin" }, iletisim: { ne: "5 gün önce", tur: "Arama" }, deger: 9600, borc: 0, durum: "active", etiket: [], randevu: 5, sonZiyaret: "31 Eki", sonZiyaretGun: 5 },
    { id: "ece", iletisimGun: 7, ad: "Ece Doğan", tel: "0535 488 51 76", eposta: "ecedogan@gmail.com", hizmet: "Cilt Bakımı", toplam: 10, kalan: 1, sira: { gun: "10 Kas Sal", saat: "10:00", uzman: "Merve" }, iletisim: { ne: "1 hafta önce", tur: "Seans" }, deger: 12000, borc: 0, durum: "active", etiket: ["VIP"], randevu: 11, sonZiyaret: "29 Eki", sonZiyaretGun: 7 },
    { id: "selint", iletisimGun: 150, ad: "Selin Tok", tel: "0536 902 44 18", eposta: "selintok@gmail.com", hizmet: "Lazer Epilasyon", toplam: 8, kalan: 0, sira: null, iletisim: { ne: "5 ay önce", tur: "Seans" }, deger: 9600, borc: 0, durum: "passive", etiket: [], randevu: 8, sonZiyaret: "4 Haz", sonZiyaretGun: 154 },
    { id: "okan", iletisimGun: 120, ad: "Okan Erdem", tel: "0542 118 63 70", eposta: "okanerdem@gmail.com", hizmet: "Medikal Masaj", toplam: 6, kalan: 2, sira: null, iletisim: { ne: "4 ay önce", tur: "Arama" }, deger: 4800, borc: 0, durum: "passive", etiket: [], randevu: 4, sonZiyaret: "8 Tem", sonZiyaretGun: 120 },
    { id: "aslitan", iletisimGun: 300, ad: "Aslı Tan", tel: "0530 774 12 95", eposta: "aslitan@gmail.com", hizmet: "Cilt Bakımı", toplam: 10, kalan: 0, sira: null, iletisim: { ne: "10 ay önce", tur: "Seans" }, deger: 11000, borc: 0, durum: "archived", etiket: [], randevu: 10, sonZiyaret: "Oca", sonZiyaretGun: 300 },
  ];
  const SAYIM = { aktif: 1142, pasif: 96, arsiv: 46, toplam: 1284 };

  const BUGUN = [
    { saat: "09:00", bitis: "10:00", uzman: "merve", musteri: "Sevgi Uçar", hizmet: "Hydrafacial", durum: "completed" },
    { saat: "09:30", bitis: "10:30", uzman: "burak", musteri: "Kemal Yurt", hizmet: "Medikal Masaj", durum: "completed" },
    { saat: "09:30", bitis: "10:15", uzman: "selin", musteri: "Pınar Ateş", hizmet: "Lazer Epilasyon", durum: "completed" },
    { saat: "10:00", bitis: "10:50", uzman: "elif", musteri: "Tuğba Erol", hizmet: "Reformer Pilates", durum: "no_show" },
    { saat: "10:30", bitis: "11:30", uzman: "merve", musteri: "Zeynep Arslan", mid: "zeynep", hizmet: "Cilt Bakımı", seans: "7/10", durum: "planned", siradaki: true },
    { saat: "11:00", bitis: "11:45", uzman: "selin", musteri: "Damla Şen", hizmet: "Lazer Epilasyon", seans: "3/8", durum: "planned" },
    { saat: "11:30", bitis: "12:30", uzman: "burak", musteri: "Serkan Bulut", hizmet: "Medikal Masaj", durum: "planned" },
    { saat: "12:00", bitis: "12:45", uzman: "elif", musteri: "İrem Kara", hizmet: "Diyetisyen Görüşmesi", durum: "planned" },
    { saat: "13:30", bitis: "14:30", uzman: "merve", musteri: "Melis Acar", hizmet: "Cilt Bakımı", seans: "2/10", durum: "planned" },
    { saat: "14:00", bitis: "14:45", uzman: "selin", musteri: "Buse Tekin", hizmet: "Lazer Epilasyon", seans: "6/8", durum: "planned" },
    { saat: "15:00", bitis: "16:00", uzman: "burak", musteri: "Ahmet Kurt", hizmet: "Medikal Masaj", durum: "cancelled" },
    { saat: "15:30", bitis: "17:00", uzman: "merve", musteri: "Gamze Öz", hizmet: "Kalıcı Makyaj", durum: "planned" },
    { saat: "16:00", bitis: "16:50", uzman: "elif", musteri: "Sena Avcı", hizmet: "Reformer Pilates", seans: "8/12", durum: "planned" },
    { saat: "17:00", bitis: "17:50", uzman: "elif", musteri: "Derya Koç", mid: "derya", hizmet: "Reformer Pilates", seans: "4/12", durum: "planned" },
  ];
  const SIMDI = "10:12";

  const BORCLU = [
    { ad: "Oya Sezer", borc: 5600, gecikmis: true },
    { ad: "Hakan Tunç", borc: 4200, gecikmis: false, mid: "hakan" },
    { ad: "Murat Eren", borc: 3800, gecikmis: true },
    { ad: "Derya Koç", borc: 3000, gecikmis: true, mid: "derya" },
    { ad: "Zeynep Arslan", borc: 2000, gecikmis: false, mid: "zeynep" },
  ];
  const ALACAK = { toplam: 23400, musteri: 9, gecikmis: 3, kalanMusteri: 4, kalanTutar: 4800 };
  const FIRSAT = [
    { l: "Paketi bitmek üzere", n: 12, i: "package-x", d: "Yenileme teklifi sun" },
    { l: "90+ gündür gelmeyen", n: 37, i: "clock-3", d: "Geri kazanım mesajı gönder" },
    { l: "Bu hafta doğum günü", n: 4, i: "cake", d: "Tebrik et, hediye seans öner" },
  ];
  const SON_EKLENEN = [
    { ad: "Hakan Tunç", tarih: "2 Kas", mid: "hakan" }, { ad: "İrem Kara", tarih: "1 Kas" },
    { ad: "Damla Şen", tarih: "31 Eki" }, { ad: "Can Aksoy", tarih: "29 Eki", mid: "can" },
    { ad: "Serkan Bulut", tarih: "28 Eki" },
  ];
  const GELIR6 = [
    { ay: "Haziran", k: "Haz", v: 148200 }, { ay: "Temmuz", k: "Tem", v: 162900 },
    { ay: "Ağustos", k: "Ağu", v: 139400 }, { ay: "Eylül", k: "Eyl", v: 171300 },
    { ay: "Ekim", k: "Eki", v: 186750 }, { ay: "Kasım", k: "Kas", v: 41850, kismi: true },
  ];
  const GUNLUK14 = [7400, 8100, 9600, 5200, 6800, 7900, 8600, 9100, 6300, 9300, 6400, 7900, 13900, 4350];
  const DONEM = {
    bugun: { kars: "düne göre", v: [tl(4350), "14", "2"], d: [-18, 17, 0] },
    hafta: { kars: "geçen haftaya göre", v: [tl(49700), "88", "21"], d: [9, 6, 11] },
    ay: { kars: "geçen ay aynı döneme göre", v: [tl(41850), "64", "18"], d: [12, 8, -5] },
    yil: { kars: "geçen yıl aynı döneme göre", v: [tl(1642300), "2.418", "412"], d: [21, 14, 9] },
  };

  function musteriBul(idOrAd) {
    const m = MUSTERI.find((x) => x.id === idOrAd || x.ad === idOrAd);
    if (m) return m;
    const h = hash(idOrAd);
    const hizmet = (BUGUN.find((b) => b.musteri === idOrAd) || {}).hizmet || "Cilt Bakımı";
    const toplam = [6, 8, 10, 12][h % 4];
    return {
      id: idOrAd, ad: idOrAd, tel: `05${30 + (h % 20)} ${100 + (h % 899)} ${10 + (h % 89)} ${10 + ((h >> 3) % 89)}`,
      eposta: idOrAd.toLocaleLowerCase("tr").replace(/\s+/g, ".").replace(/[çğıöşüİ]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" }[c])) + "@gmail.com",
      hizmet, toplam, kalan: 1 + (h % (toplam - 1)), sira: null, iletisim: { ne: `${2 + (h % 9)} gün önce`, tur: "Mesaj" },
      deger: 2000 + (h % 12) * 750, borc: 0, durum: "active", etiket: [], randevu: 2 + (h % 12), sonZiyaret: "Bugün", sonZiyaretGun: 0,
    };
  }

  function etkilesimler(m) {
    const list = [];
    if (m.iletisim.tur === "Mesaj") list.push({ i: "message-circle", t: "Randevu hatırlatması gönderildi", z: m.iletisim.ne });
    if (m.iletisim.tur === "Arama") list.push({ i: "phone", t: "Telefonla arandı, paket bilgisi verildi", z: m.iletisim.ne });
    if (m.iletisim.tur === "Not") list.push({ i: "sticky-note", t: "Not eklendi: beslenme planı paylaşıldı", z: m.iletisim.ne });
    if (m.iletisim.tur === "Randevu") list.push({ i: "calendar-plus", t: "Randevu oluşturuldu", z: m.iletisim.ne });
    if (m.borc > 0) list.push({ i: "banknote", t: `${tl(m.deger)} ödeme alındı`, z: m.sonZiyaret });
    list.push({ i: "circle-check", t: m.toplam ? `${m.hizmet}: ${m.toplam - m.kalan}. seans tamamlandı` : `${m.hizmet} tamamlandı`, z: m.sonZiyaret });
    list.push({ i: "user-plus", t: "Müşteri kaydı oluşturuldu", z: "Eylül" });
    return list.slice(0, 4);
  }

  /* customer-360-view.tsx'teki "önerilen sonraki işlem" sırası */
  function oneri(m) {
    if (m.borc > 0) return { tone: m.gecikmis ? "danger" : "warning", i: "wallet", t: m.gecikmis ? `${tl(m.borc)} gecikmiş borç var.` : `${tl(m.borc)} açık borç var.`, cta: "Ödeme al", act: "pay" };
    if (m.toplam && m.kalan <= 2) return { tone: "warning", i: "package", t: m.kalan === 0 ? "Paketi bitti. Yenileme teklifi sunun." : `Paketinde ${m.kalan} seans kaldı. Yenileme teklifi sunun.`, cta: "Paket sat", act: "paket" };
    if (m.sonZiyaretGun >= 60) return { tone: "warning", i: "clock", t: `Son ziyaret ${m.sonZiyaretGun} gün önce. Geri kazanmak için yazın.`, cta: "WhatsApp", act: "wa" };
    if (!m.sira) return { tone: "brand", i: "calendar-plus", t: "Planlı randevusu yok. Yeni randevu önerin.", cta: "Randevu oluştur", act: "randevu" };
    return null;
  }

  /* ---------------- Menü (kullanıcının onayladığı gruplama) ---------------- */
  const NAV = [
    { key: "ana", items: [
      { k: "panel", l: "Genel Bakış", i: "layout-grid" },
      { k: "takvim", l: "Takvim", i: "calendar" },
      { k: "randevular", l: "Randevular", i: "calendar-check" },
      { k: "musteriler", l: "Müşteriler", i: "users" },
      { k: "gorevler", l: "Görevler", i: "list-checks", count: 5 },
    ] },
    { key: "satis", label: "Satış", items: [
      { k: "satislar", l: "Satışlar", i: "shopping-bag" },
      { k: "paketler", l: "Paketler", i: "package" },
      { k: "cari", l: "Cari Hesap", i: "wallet", alert: 3, tip: "3 gecikmiş ödeme" },
    ] },
    { key: "buyume", label: "Büyüme", items: [
      { k: "leadler", l: "Lead'ler", i: "inbox" },
      { k: "firsatlar", l: "Gelir Fırsatları", i: "trending-up" },
      { k: "randevu-linki", l: "Randevu Linki", i: "link" },
      { k: "hatirlatmalar", l: "Hatırlatmalar", i: "bell" },
    ] },
    { key: "yonetim", label: "Yönetim", items: [
      { k: "raporlar", l: "Raporlar", i: "chart-column" },
      { k: "hizmetler", l: "Hizmetler", i: "layers" },
      { k: "personel", l: "Personel", i: "user-cog" },
      { k: "stok", l: "Stok", i: "boxes" },
      { k: "giderler", l: "Giderler", i: "receipt" },
    ] },
  ];
  const AYARLAR = { k: "ayarlar", l: "Ayarlar", i: "settings" };
  const ALL_NAV = NAV.flatMap((g) => g.items).concat([AYARLAR, { k: "menu", l: "Menü" }]);
  const TITLES = { panel: "Genel Bakış", musteriler: "Müşteriler", menu: "Menü" };
  /* Sekme çubuğu: dolu simgeler (HIG › Tab bars: "Prefer filled symbols"); arama ayrı düğme (HIG › Search fields › iOS) */
  const SVG = {
    grid: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2.4"/><rect x="13" y="3" width="8" height="8" rx="2.4"/><rect x="3" y="13" width="8" height="8" rx="2.4"/><rect x="13" y="13" width="8" height="8" rx="2.4"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="2" width="2.2" height="4.4" rx="1.1"/><rect x="14.8" y="2" width="2.2" height="4.4" rx="1.1"/><path fill-rule="evenodd" d="M6.6 4.2h10.8A3.6 3.6 0 0 1 21 7.8v9.6a3.6 3.6 0 0 1-3.6 3.6H6.6A3.6 3.6 0 0 1 3 17.4V7.8a3.6 3.6 0 0 1 3.6-3.6Zm-1.4 5.3v7.8c0 .9.6 1.5 1.5 1.5h10.6c.9 0 1.5-.6 1.5-1.5V9.5Z"/><rect x="7" y="11.2" width="2.4" height="2.4" rx=".6"/><rect x="10.8" y="11.2" width="2.4" height="2.4" rx=".6"/><rect x="14.6" y="11.2" width="2.4" height="2.4" rx=".6"/><rect x="7" y="15" width="2.4" height="2.4" rx=".6"/><rect x="10.8" y="15" width="2.4" height="2.4" rx=".6"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="16.6" cy="8.4" r="3"/><path d="M16.7 13.3c2.9 0 5.1 1.9 5.1 4.6 0 .7-.5 1.1-1.1 1.1h-3.6c.1-.3.1-.6.1-1 0-1.8-.7-3.4-2-4.5.5-.1 1-.2 1.5-.2Z"/><circle cx="9" cy="7.8" r="3.7"/><path d="M2.4 19.1c0-3.4 2.9-5.9 6.6-5.9s6.6 2.5 6.6 5.9c0 .8-.5 1.2-1.2 1.2H3.6c-.7 0-1.2-.4-1.2-1.2Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3.5" y="5" width="17" height="2.4" rx="1.2"/><rect x="3.5" y="10.8" width="17" height="2.4" rx="1.2"/><rect x="3.5" y="16.6" width="17" height="2.4" rx="1.2"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2"/><path d="m15.3 15.3 5.2 5.2"/></svg>',
  };
  const TABS = [
    { k: "panel", l: "Genel Bakış", svg: SVG.grid },
    { k: "takvim", l: "Takvim", svg: SVG.cal },
    { k: "musteriler", l: "Müşteriler", svg: SVG.people },
    { k: "menu", l: "Menü", svg: SVG.menu },
  ];

  /* ---------------- Liste: filtre tanımları ---------------- */
  const FDEF = [
    { k: "hizmet", l: "Hizmet", ops: [...new Set(MUSTERI.map((m) => m.hizmet))].sort((a, b) => a.localeCompare(b, "tr")).map((h) => ({ v: h, l: h })), test: (m, v) => m.hizmet === v },
    { k: "kalan", l: "Kalan seans", ops: [{ v: "var", l: "Seansı var" }, { v: "az", l: "Az kaldı (2 ve altı)" }, { v: "bitti", l: "Paketi bitti" }], test: (m, v) => (v === "var" ? m.kalan > 0 : v === "az" ? m.kalan > 0 && m.kalan <= 2 : m.toplam && m.kalan === 0) },
    { k: "borc", l: "Ödeme", ops: [{ v: "var", l: "Açık borcu olan" }, { v: "gecikmis", l: "Gecikmiş borcu olan" }], test: (m, v) => (v === "var" ? m.borc > 0 : !!m.gecikmis) },
    { k: "iletisim", l: "Son iletişim", ops: [{ v: "0", l: "Bugün" }, { v: "7", l: "Son 7 gün" }, { v: "30", l: "Son 30 gün" }, { v: "90", l: "Son 90 gün" }], test: (m, v) => m.iletisimGun <= +v },
    { k: "etiket", l: "Etiket", ops: [{ v: "VIP", l: "VIP" }, { v: "Taksitli", l: "Taksitli" }], test: (m, v) => m.etiket.includes(v) },
  ];
  const SCOPES = [{ k: "aktif", l: "Aktif", n: SAYIM.aktif }, { k: "pasif", l: "Pasif", n: SAYIM.pasif }, { k: "arsiv", l: "Arşiv", n: SAYIM.arsiv }];
  const scopeOf = (m) => (m.durum === "archived" ? "arsiv" : m.durum === "passive" ? "pasif" : "aktif");

  /* ---------------- Durum ---------------- */
  const S = {
    route: null,
    donem: "ay",
    collapsed: {},
    earlierOpen: false,
    appts: BUGUN.map((a, i) => ({ ...a, i })),
    view: (() => { try { return localStorage.getItem("ef-gorunum") === "cizelge" ? "cizelge" : "liste"; } catch (err) { return "liste"; } })(),
    inspector: true,
    list: { scope: "aktif", q: "", f: {}, sort: { k: "iletisim", dir: 1 }, selId: null, selecting: false, picked: new Set() },
  };

  function rows() {
    const L = S.list;
    const q = L.q.trim().toLocaleLowerCase("tr"), qd = q.replace(/\D/g, "");
    let r = MUSTERI.filter((m) => scopeOf(m) === L.scope);
    if (q) r = r.filter((m) => (m.ad + " " + m.eposta).toLocaleLowerCase("tr").includes(q) || (qd.length > 2 && m.tel.replace(/\D/g, "").includes(qd)));
    for (const [k, v] of Object.entries(L.f)) { const d = FDEF.find((x) => x.k === k); r = r.filter((m) => d.test(m, v)); }
    const { k, dir } = L.sort;
    const val = (m) => (k === "ad" ? m.ad : k === "deger" ? m.deger : m.iletisimGun);
    return [...r].sort((a, b) => { const A = val(a), B = val(b); return (typeof A === "string" ? A.localeCompare(B, "tr") : A - B) * dir; });
  }
  const nFilters = () => Object.keys(S.list.f).length;

  /* ======================================================================
     Kabuk
     ====================================================================== */
  const app = $("#app");

  const itemHtml = (it, active) =>
    `<a class="sb-item" href="#${it.k}" ${it.k === active ? 'aria-current="page"' : ""}>${ic(it.i)}<span class="lbl">${it.l}</span>${it.count ? `<span class="sb-count" aria-label="${it.count} açık görev">${it.count}</span>` : ""}${it.alert ? `<span class="sb-alert" data-tip="${it.tip}" aria-label="${it.tip}">${it.alert}</span>` : ""}</a>`;

  function sidebarHtml(active) {
    return `<aside class="sidebar glass-strong" aria-label="Ana menü">
      <button class="sb-account" data-demo="İşletme ve hesap menüsü açılır">
        <span class="sb-logo" aria-hidden="true">N</span>
        <span class="sb-acc-text"><span class="sb-acc-name trunc">Nur Güzellik</span><span class="sb-acc-sub trunc">Elif Kaya · İşletme sahibi</span></span>
        ${ic("chevrons-up-down")}
      </button>
      <nav class="sb-nav" aria-label="Bölümler">${NAV.map((g) => {
        const open = !S.collapsed[g.key];
        return `<div class="sb-group">${g.label ? `<button class="sb-head" aria-expanded="${open}" aria-controls="sbg-${g.key}" data-group="${g.key}">${g.label}${ic("chevron-down")}</button>` : ""}
          <ul id="sbg-${g.key}" ${open ? "" : "hidden"}>${g.items.map((it) => `<li>${itemHtml(it, active)}</li>`).join("")}</ul></div>`;
      }).join("")}</nav>
      <div class="sb-foot">${itemHtml(AYARLAR, active)}</div>
    </aside>`;
  }

  function tokensHtml() {
    return Object.entries(S.list.f).map(([k, v]) => {
      const d = FDEF.find((x) => x.k === k), o = d.ops.find((x) => x.v === v);
      return `<span class="token" title="${d.l}: ${o.l}"><span>${o.l}</span><button type="button" data-unf="${k}" aria-label="${d.l} filtresini kaldır">${ic("x")}</button></span>`;
    }).join("");
  }

  function toolbarHtml(route) {
    const t = TITLES[route] || "";
    let trail = "";
    if (route === "panel") {
      trail = `
        <label class="search glass tb-search d-only" id="gsearch-wrap">${ic("search")}<input type="search" id="gsearch" placeholder="Müşteri ara" aria-label="Müşteri ara" autocomplete="off" aria-autocomplete="list" aria-controls="suggest" aria-expanded="false"></label>
        <button class="btn glass glass-pill d-only" data-pay>${ic("banknote")}Ödeme al</button>
        <button class="btn btn-prominent tb-primary" data-demo="Taslak: randevu formu açılır" aria-label="Randevu oluştur">${ic("plus")}<span class="lbl">Randevu oluştur</span></button>`;
    } else if (route === "musteriler") {
      const nf_ = nFilters();
      trail = `
        <div class="tb-group glass d-only" role="group" aria-label="Görünüm">
          <button class="btn-icon ${nf_ ? "is-on" : ""}" data-filter aria-haspopup="true" aria-expanded="false" aria-label="Filtrele" data-tip="Filtrele">${ic("list-filter")}</button>
          <button class="btn-icon insp-toggle" data-toggle-insp aria-pressed="${S.inspector}" aria-label="Ayrıntı bölmesi" data-tip="Ayrıntı bölmesini göster ya da gizle">${ic("panel-right")}</button>
        </div>
        <label class="search glass tb-search d-only ${nf_ ? "has-tokens" : ""}">${ic("search")}${tokensHtml()}<input type="search" id="lsearch" placeholder="Ad, telefon veya e-posta" aria-label="Müşteri ara" autocomplete="off" value="${esc(S.list.q)}">${S.list.q ? `<button type="button" class="clear" data-clearq aria-label="Aramayı temizle">${ic("x")}</button>` : ""}</label>
        <button class="glass-btn glass m-only ${nf_ ? "is-on" : ""}" data-filter aria-haspopup="dialog" aria-label="Filtrele">${ic("list-filter")}${nf_ ? `<span class="badge-dot">${nf_}</span>` : ""}</button>
        <button class="btn btn-prominent tb-primary" data-demo="Taslak: müşteri formu açılır" aria-label="Müşteri ekle">${ic("plus")}<span class="lbl">Müşteri ekle</span></button>`;
    }
    return `<div class="tb-lead"><button class="glass-btn glass" data-toggle-sidebar aria-label="Kenar çubuğunu göster ya da gizle" data-tip="Kenar çubuğu">${ic("panel-left")}</button><span class="tb-title d-only" aria-hidden="true">${t}</span></div>
      <div class="tb-center m-only"><span class="tb-title" aria-hidden="true">${t}</span></div>
      <div class="tb-trail">${trail}</div>`;
  }

  function tabbarHtml(route) {
    return `<span class="tab-lens" aria-hidden="true"></span>` + TABS.map((t) => `<a class="tab" href="#${t.k}" ${t.k === route ? 'aria-current="page"' : ""}>${t.svg}<span>${t.l}</span></a>`).join("");
  }

  function renderShell() {
    app.innerHTML = `<div class="app" id="frame">
        <div id="sb-slot" style="display:contents"></div>
        <div class="main-col">
          <header class="toolbar" id="toolbar"></header>
          <main id="main" tabindex="-1"></main>
        </div>
      </div>
      <div class="edge-bottom" aria-hidden="true"></div>
      <nav class="tabbar glass" id="tabbar" aria-label="Sekmeler">${tabbarHtml("")}</nav>
      <button class="search-tab glass" data-open-search aria-label="Ara">${SVG.search}</button>
      <div class="m-results glass-strong" id="mresults" role="listbox" aria-label="Arama sonuçları"></div>
      <label class="m-searchbar glass">${ic("search")}<input type="search" id="bsearch" placeholder="Müşteri ara" aria-label="Müşteri ara" autocomplete="off"></label>
      <button class="m-search-close glass-btn glass" data-close-search aria-label="Aramayı kapat">${ic("x")}</button>`;
  }

  /* ======================================================================
     Genel Bakış
     ====================================================================== */
  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const NOW = toMin(SIMDI);
  const PERS = Object.fromEntries(PERSONEL.map((p) => [p.id, p]));
  const UNVAN = { merve: "Cilt bakımı", selin: "Lazer", burak: "Fizyoterapi", elif: "Pilates" };
  const uzmanAd = (id) => PERS[id].ad.split(" ")[0];
  const DURUM_AD = { completed: "Tamamlandı", planned: "Planlandı", arrived: "Geldi", no_show: "Gelmedi", cancelled: "İptal" };
  const byTime = (a, b) => toMin(a.saat) - toMin(b.saat) || a.i - b.i;
  const nextPlanned = () => S.appts.filter((a) => a.durum === "planned").sort(byTime)[0] || null;
  const counts = () => S.appts.reduce((c, a) => ((c[a.durum] = (c[a.durum] || 0) + 1), c), {});
  const apptOf = (ad) => S.appts.find((a) => a.musteri === ad);
  const apptLine = (a) => `${a.hizmet}${a.seans ? ` · ${a.seans} seans` : ""} · ${uzmanAd(a.uzman)}`;
  const sumText = () => {
    const c = counts();
    return [`${S.appts.length} randevu`, `${c.completed || 0} tamamlandı`, c.arrived ? `${c.arrived} geldi` : "", c.no_show ? `${c.no_show} gelmedi` : "", c.cancelled ? `${c.cancelled} iptal` : ""].filter(Boolean).join(" · ");
  };

  /* Ciro kutusundaki küçük çizgi grafik: altta solan dolgu, son noktada dolu nokta (F) */
  function sparkline(data, w = 72, h = 24) {
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, k) => [(k / (data.length - 1)) * (w - 6) + 3, h - 3 - ((v - min) / (max - min || 1)) * (h - 8)]);
    const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
    const lp = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="ef-spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".5"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".06"/></linearGradient></defs>
      <polygon points="3,${h} ${line} ${w - 3},${h}" fill="url(#ef-spark)"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lp[0]}" cy="${lp[1]}" r="3" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.6"/></svg>`;
  }

  function metricHtml(k) {
    const sub = k.flag
      ? `<span class="state ${k.flagTone || "t-red"}">${ic("circle-alert")}${k.flag}</span>${k.ctx ? `<span class="${k.ctxDesk ? "ctx-wide" : ""}">· ${k.ctx}</span>` : ""}`
      : `${delta(k.d)}${k.ctx ? `<span class="${k.ctxDesk ? "ctx-wide" : ""}">${k.ctx}</span>` : ""}`;
    const Tag = k.href ? "a" : "div";
    return `<${Tag} class="metric" ${k.href ? `href="${k.href}"` : ""} data-mk="${k.key || ""}">
      <span class="m-label"><span class="trunc">${k.l}</span>${k.href ? ic("chevron-right", "chev") : ""}</span>
      <span class="m-value ${k.danger ? "t-red" : ""}">${k.v}</span>
      <span class="m-sub">${sub}</span>
      ${k.spark ? `<span class="m-spark" title="Son 14 gün">${sparkline(GUNLUK14)}</span>` : ""}</${Tag}>`;
  }

  function panelKpis() {
    const p = DONEM[S.donem];
    return [
      { key: "ciro", l: "Ciro", v: p.v[0], d: p.d[0], ctx: p.kars, ctxDesk: true, href: "#satislar", spark: true },
      { key: "randevu", l: "Randevu", v: p.v[1], d: p.d[1], ctx: p.kars, ctxDesk: true, href: "#randevular" },
      { key: "yeni", l: "Yeni müşteri", v: p.v[2], d: p.d[2], ctx: p.kars, ctxDesk: true, href: "#musteriler" },
      { key: "borc", l: "Açık borç", v: tl(ALACAK.toplam), flag: `${ALACAK.gecikmis} gecikmiş`, ctx: `${ALACAK.musteri} müşteri`, ctxDesk: true, href: "#cari", danger: true },
    ];
  }

  /* Dönem değişince değerler başparmağın gittiği yönden gelir */
  function changePeriod(k, i, from) {
    S.donem = k;
    const dir = i > from ? 1 : -1;
    const host = $("#kpis");
    if (!host) return;
    panelKpis().forEach((m) => {
      if (m.key === "borc") return;
      const old = host.querySelector(`[data-mk="${m.key}"]`);
      const tmp = document.createElement("div"); tmp.innerHTML = metricHtml(m);
      const ne = tmp.firstElementChild; old.replaceWith(ne);
      [ne.querySelector(".m-value"), ne.querySelector(".m-sub")].forEach((p) => p && p.animate(
        reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateX(${dir * 14}px)`, filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
        { duration: reduced() ? 160 : SPRING.ms, easing: SPRING.css }));
    });
    const cap = $("#ctxCap"); if (cap) cap.textContent = `Değişim: ${DONEM[k].kars}`;
    icons();
  }

  /* ---------- Bugünün programı: Liste ---------- */
  function apptEnd(a) {
    if (a.durum === "completed") return `<span class="state t-2">${ic("circle-check")}Tamamlandı</span>`;
    if (a.durum === "no_show") return `<span class="state t-red">${ic("circle-alert")}Gelmedi</span>`;
    if (a.durum === "cancelled") return `<span class="state t-2">${ic("circle-x")}İptal</span>`;
    if (a.durum === "arrived") return `<span class="state t-green">${ic("circle-check")}Geldi<span class="d-only"> · ${a.geldi}</span></span><button class="btn btn-plain btn-sm d-only" data-undo="${a.i}">Geri al</button>`;
    return `<button class="geldi geldi-sm hover-only" data-geldi="${a.i}" aria-label="${esc(a.musteri)}: Geldi olarak işaretle"><span class="lbl">${ic("check")}<span>Geldi</span></span></button>`;
  }
  function apptRowHtml(a) {
    const lead = a.durum === "planned" ? `<div class="sw-acts lead"><button class="sa green" data-geldi="${a.i}" tabindex="-1" aria-hidden="true">${ic("check")}Geldi</button></div>`
      : a.durum === "arrived" ? `<div class="sw-acts lead"><button class="sa gray" data-undo="${a.i}" tabindex="-1" aria-hidden="true">${ic("undo-2")}Geri al</button></div>` : "";
    return `<div class="sw appt-sw" data-i="${a.i}">${lead}<div class="sw-c"><div class="row appt is-${a.durum}" data-appt="${a.i}" tabindex="0" role="button" aria-label="${a.saat} ${esc(a.musteri)}, ${a.hizmet}, ${DURUM_AD[a.durum]}">
      <div class="appt-time"><b>${a.saat}</b><span>${a.bitis}</span></div>
      <div class="row-main"><div class="row-title">${a.musteri}</div><div class="row-sub">${apptLine(a)}</div></div>
      <div class="row-end">${apptEnd(a)}</div></div></div></div>`;
  }

  function nextBodyHtml(a) {
    if (!a) return `<div class="next-body" data-i="-1"><div class="next-eyebrow">${ic("sunset")}<span>${up("Bugün başka randevu yok")}</span></div>
      <p class="t-2" style="font-size:14px">Gün tamamlandı. Yeni randevu oluşturabilir ya da yarının programına bakabilirsiniz.</p></div>`;
    const m = musteriBul(a.mid || a.musteri);
    const mins = toMin(a.saat) - NOW;
    const rel = mins > 0 ? `${mins} dk sonra` : mins === 0 ? "şimdi" : `${-mins} dk gecikti`;
    const flag = m.borc ? `<div class="next-flag">${ic("circle-alert")}${tl(m.borc)} ${m.gecikmis ? "gecikmiş borç" : "açık borç"}</div>` : "";
    return `<div class="next-body" data-i="${a.i}">
      <div class="next-eyebrow">${ic("clock")}<span>${up("Sıradaki · " + rel)}</span></div>
      <div class="next-row">
        <div class="appt-time"><b>${a.saat}</b><span>${a.bitis}</span></div>
        ${mono(a.musteri, "mono-lg")}
        <div class="row-main">
          <div class="next-name"><strong><a href="#musteriler/${encodeURIComponent(m.id)}" class="name-link">${a.musteri}</a></strong>${tags(m)}</div>
          <div class="next-meta">${apptLine(a)}</div>${flag}
        </div>
        <div class="next-actions">
          <button class="btn btn-bordered" data-pay="${esc(m.id)}">${ic("banknote")}Ödeme al</button>
          <button class="geldi" data-geldi="${a.i}" aria-pressed="false" aria-label="${esc(a.musteri)}: Geldi olarak işaretle"><span class="lbl">${ic("user-check")}<span>Geldi</span></span></button>
        </div>
      </div></div>`;
  }

  /* Sıradaki kartı: Geldi → dolgu yayılır, kısa bekleme, sonra kart sıradakine kayar.
     Geri al: uçuştaki geçiş anlık değerinden geri döner; bittiyse ters yönden geri gelir. */
  const Next = {
    shown: null, swap: null, timer: 0,
    stage() { return $("#next .next-stage"); },
    target() { return this.swap ? (this.swap.reversing ? this.swap.from : this.swap.to) : this.shown; },
    render() {
      const st = this.stage(); if (!st) { this.shown = null; return; }
      clearTimeout(this.timer);
      if (this.swap) { this.swap.sp.stop(); this.swap = null; }
      const a = nextPlanned();
      this.shown = a ? a.i : -1;
      st.innerHTML = nextBodyHtml(a);
    },
    arrived(i, e) {
      const st = this.stage(); if (!st || this.shown !== i) return;
      const btn = st.querySelector(`.geldi[data-geldi="${i}"]`);
      if (btn && e && e.clientX) { const r = btn.getBoundingClientRect(); btn.style.setProperty("--px", e.clientX - r.left + "px"); btn.style.setProperty("--py", e.clientY - r.top + "px"); }
      if (btn) {
        btn.querySelector(".lbl").innerHTML = `${ic("check", "ic-check")}<span>Geldi · ${SIMDI}</span>`;
        btn.getBoundingClientRect();
        btn.classList.add("is-done"); btn.setAttribute("aria-pressed", "true");
        btn.removeAttribute("data-geldi"); btn.dataset.undo = i;
        btn.setAttribute("aria-label", `${S.appts[i].musteri} geldi. Geri almak için basın.`);
      }
      const eb = st.querySelector(".next-eyebrow");
      if (eb) { eb.innerHTML = `${ic("circle-check")}<span>${up("Geldi · " + SIMDI)}</span>`; eb.classList.add("is-arrived"); }
      icons();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.sync(), reduced() ? 900 : 1300);
    },
    sync() {
      const st = this.stage(); if (!st) return;
      clearTimeout(this.timer);
      const want = nextPlanned(), wantI = want ? want.i : -1;
      if (this.swap) {
        if (wantI === this.swap.from) {
          const W = this.swap;
          W.reversing = true;
          W.sp.to(0, { response: 0.42, damping: 1, onRest: () => { W.newEl.remove(); W.oldEl.style.cssText = ""; st.style.height = ""; if (this.swap === W) this.swap = null; this.shown = W.from; drawTodayRows(); } });
          drawTodayRows();
          return;
        }
        if (wantI === this.swap.to && !this.swap.reversing) return;
        this.swap.sp.stop(); this.swap.finish(); this.swap = null;
      }
      if (wantI === this.shown) {
        const body = st.querySelector(".next-body");
        const btn = st.querySelector(".geldi.is-done");
        if (btn && want) {
          // aynı randevu: dolgu basılan noktaya geri çekilir, etiket eski haline döner
          btn.classList.remove("is-done"); btn.setAttribute("aria-pressed", "false");
          btn.removeAttribute("data-undo"); btn.dataset.geldi = want.i;
          btn.setAttribute("aria-label", `${want.musteri}: Geldi olarak işaretle`);
          btn.querySelector(".lbl").innerHTML = `${ic("user-check")}<span>Geldi</span>`;
          const eb = body.querySelector(".next-eyebrow"); eb.classList.remove("is-arrived");
          const tmp = document.createElement("div"); tmp.innerHTML = nextBodyHtml(want);
          eb.innerHTML = tmp.querySelector(".next-eyebrow").innerHTML;
          icons();
        } else if (body) { body.outerHTML = nextBodyHtml(want); icons(); }
        drawTodayRows();
        return;
      }
      const from = this.shown, oldEl = st.querySelector(".next-body");
      const tmp = document.createElement("div"); tmp.innerHTML = nextBodyHtml(want);
      const newEl = tmp.firstElementChild; newEl.classList.add("incoming"); st.append(newEl);
      icons();
      const fromMin = from >= 0 ? toMin(S.appts[from].saat) : 0, toM = want ? toMin(want.saat) : 24 * 60;
      const dir = toM >= fromMin ? 1 : -1; // zaman soldan sağa akar: ileri = sola çık, sağdan gir
      const D = 40, h0 = oldEl.offsetHeight, h1 = newEl.offsetHeight;
      const apply = (p) => {
        st.style.height = h0 === h1 ? "" : `${(h0 + (h1 - h0) * clamp(p, 0, 1)).toFixed(1)}px`;
        oldEl.style.transform = `translateX(${-dir * D * p}px)`; oldEl.style.opacity = clamp(1 - p * 1.4, 0, 1);
        oldEl.style.filter = `blur(${(p * 3).toFixed(2)}px)`;
        newEl.style.transform = `translateX(${dir * D * (1 - p)}px)`; newEl.style.opacity = clamp((p - 0.15) * 1.3, 0, 1);
        newEl.style.filter = p < 0.98 ? `blur(${((1 - p) * 3).toFixed(2)}px)` : "none";
      };
      const sp = new Spring(0, { precision: 0.001, onUpdate: apply });
      const W = { from, to: wantI, sp, oldEl, newEl, finish: () => { oldEl.remove(); newEl.style.cssText = ""; newEl.classList.remove("incoming"); st.style.height = ""; this.shown = wantI; } };
      this.swap = W;
      sp.jump(0);
      sp.to(1, { response: 0.46, damping: 1, onRest: () => { if (this.swap === W) { W.finish(); this.swap = null; } } });
      drawTodayRows(dir > 0 ? from : null);
    },
  };

  function listViewHtml() {
    return `<button class="row disclose" aria-expanded="${S.earlierOpen}" aria-controls="earlier" data-earlier>${ic("chevron-right", "dis")}
        <div class="row-main"><div class="row-title" id="earlierT"></div><div class="row-sub" id="earlierS"></div></div></button>
      <div class="earlier" id="earlier" ${S.earlierOpen ? "" : "hidden"}></div>
      <div class="next" id="next"><div class="next-stage"></div></div>
      <div id="todayRows"></div>
      <a class="row row-foot" id="todayFoot" href="#takvim"></a>`;
  }

  /* Satırları yeniden çiz; değişen satır yeşerir (Geldi) */
  function drawTodayRows(changed) {
    const rowsEl = $("#todayRows"); if (!rowsEl) return;
    const heroI = Next.target();
    const done = S.appts.filter((a) => a.durum === "completed" || a.durum === "no_show").sort(byTime);
    const rest = S.appts.filter((a) => a.i !== heroI && !done.includes(a)).sort(byTime);
    const shown = rest.slice(0, 5), more = rest.slice(5);
    const c = counts();
    $("#earlierT").textContent = `${done.length} önceki randevu`;
    $("#earlierS").textContent = `${c.completed || 0} tamamlandı · ${c.no_show || 0} gelmedi`;
    $("#earlier").innerHTML = done.map(apptRowHtml).join("");
    rowsEl.innerHTML = shown.map(apptRowHtml).join("");
    const foot = $("#todayFoot");
    foot.hidden = !more.length;
    if (more.length) foot.innerHTML = `<span class="row-main">${more.length} randevu daha · ${more[more.length - 1].saat}'e kadar</span><span class="link">Tümünü gör</span>${ic("chevron-right", "chev")}`;
    const sum = $("#todaySum"); if (sum) sum.textContent = sumText();
    icons();
    if (isPhone()) $$("#todayRows .appt-sw, #earlier .appt-sw").forEach(bindApptSwipe);
    if (changed != null) {
      const row = $(`.appt-sw[data-i="${changed}"] .appt`);
      if (row) row.animate([{ backgroundColor: "var(--green-soft-2)" }, { backgroundColor: "var(--surface)" }], { duration: reduced() ? 300 : 1100, easing: "ease-out" });
    }
  }
  function bindApptSwipe(li) {
    const i = +li.dataset.i, a = S.appts[i];
    if (a.durum !== "planned" && a.durum !== "arrived") return;
    bindSwipe(li, { lead: 96, onFull: (e) => { if (a.durum === "planned") markArrived(i, e); else undoArrived(i, { toastIt: true }); } });
  }

  /* ---------- Bugünün programı: Çizelge (F) ---------- */
  const HOUR = 150, T0 = 9, T1 = 18, LANES = ["merve", "selin", "burak", "elif"];
  const xOf = (min) => ((min - T0 * 60) / 60) * HOUR;
  function blockHtml(a) {
    const np = nextPlanned();
    const cls = a === np ? "is-next" : "is-" + a.durum;
    const icon = { completed: "check", arrived: "user-check", no_show: "circle-alert", cancelled: "x" }[a.durum];
    const left = xOf(toMin(a.saat)) + 2, w = xOf(toMin(a.bitis)) - xOf(toMin(a.saat)) - 4;
    return `<button class="blk ${cls}" data-blk="${a.i}" style="left:${left}px;width:${w}px" aria-haspopup="dialog" aria-label="${a.saat}–${a.bitis} ${esc(a.musteri)}, ${a.hizmet}, ${a === np ? "sıradaki" : DURUM_AD[a.durum]}">
      <span class="b1">${icon ? ic(icon) : ""}<span class="trunc">${a.musteri}</span></span><span class="b2 num">${a.saat}–${a.bitis} · ${a.hizmet}</span></button>`;
  }
  function timelineHtml() {
    const W = (T1 - T0) * HOUR;
    let ruler = "", grid = "";
    for (let h = T0; h <= T1; h++) {
      const x = (h - T0) * HOUR;
      if (h < T1 && Math.abs(x - xOf(NOW)) > 36) ruler += `<span class="tl-hour" style="left:${x}px">${String(h).padStart(2, "0")}:00</span>`;
      grid += `<span class="tl-grid" style="left:${x}px"></span>`;
      if (h < T1) grid += `<span class="tl-grid half" style="left:${x + HOUR / 2}px"></span>`;
    }
    const rows = LANES.map((u) => `<div class="tl-row">${S.appts.filter((a) => a.uzman === u).map(blockHtml).join("")}</div>`).join("");
    return `<div class="tl">
      <div class="tl-lanes">${LANES.map((u) => `<div class="tl-lane-h">${mono(PERS[u].ad, "mono-sm")}<div style="min-width:0"><div class="nm trunc">${uzmanAd(u)}</div><div class="un trunc">${UNVAN[u]}</div></div></div>`).join("")}</div>
      <div class="tl-view" tabindex="0" role="group" aria-label="Bugünün programı çizelgesi. Sağa sola sürükleyin ya da ok tuşlarıyla kaydırın.">
        <div class="tl-track" style="width:${W}px"><div class="tl-ruler">${ruler}</div>${grid}${rows}<div class="tl-now" style="left:${xOf(NOW)}px"><span>${SIMDI}</span></div></div>
      </div></div>
      <div class="tl-foot"><span class="t-2">Bloğa tıklayın: ayrıntı ve Geldi</span><button class="btn btn-bordered btn-sm" data-tl-now>${ic("locate-fixed")}Şimdi</button></div>`;
  }
  let TL = null;
  function bindTimeline() {
    const view = $(".tl-view"), track = $(".tl-track");
    TL = null;
    if (!view) return;
    const W = (T1 - T0) * HOUR;
    const geo = { vw: view.clientWidth, min: Math.min(0, view.clientWidth - W) };
    const edges = (v) => { view.style.setProperty("--fl", v < -1 ? "28px" : "0px"); view.style.setProperty("--fr", v > geo.min + 1 ? "28px" : "0px"); };
    const x = new Spring(0, { precision: 0.2, onUpdate: (v) => { track.style.transform = `translateX(${v}px)`; edges(v); } });
    const nowPos = () => clamp(-(xOf(NOW) - geo.vw * 0.3), geo.min, 0);
    x.jump(nowPos());
    const half = HOUR / 2;
    let base = 0;
    drag(view, {
      axis: "x", threshold: 6,
      onStart: () => { x.stop(); base = x.x; view.classList.add("is-drag"); closePopover(); },
      onMove: (d) => {
        let t = base + d;
        if (t > 0) t = rubber(t, geo.vw);
        if (t < geo.min) t = geo.min + rubber(t - geo.min, geo.vw);
        x.jump(t);
      },
      onEnd: (d, v) => {
        view.classList.remove("is-drag");
        const target = clamp(Math.round((x.x + project(v)) / half) * half, geo.min, 0);
        x.to(target, { velocity: v, response: 0.5, damping: Math.abs(v) > 300 ? 0.86 : 1 });
      },
      onCancel: () => view.classList.remove("is-drag"),
    });
    view.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); x.stop(); x.jump(clamp(x.x - e.deltaX, geo.min, 0));
    }, { passive: false });
    view.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); x.to(clamp(Math.round(x.target / half) * half + (k === "ArrowLeft" ? half : -half), geo.min, 0), { response: 0.36 }); }
      if (k === "Home") { e.preventDefault(); x.to(0); }
      if (k === "End") { e.preventDefault(); x.to(geo.min); }
    });
    TL = {
      now() { x.to(nowPos(), { response: 0.5 }); },
      relayout() { geo.vw = view.clientWidth; geo.min = Math.min(0, geo.vw - W); x.jump(clamp(x.x, geo.min, 0)); },
    };
  }
  function refreshBlocks(pulseI) {
    if (!$(".tl-track")) return;
    S.appts.forEach((a) => {
      const b = $(`.blk[data-blk="${a.i}"]`); if (!b) return;
      const tmp = document.createElement("div"); tmp.innerHTML = blockHtml(a);
      const nb = tmp.firstElementChild;
      if (nb.className !== b.className) { b.replaceWith(nb); if (a.i === pulseI) { nb.classList.add("pulse"); setTimeout(() => nb.classList.remove("pulse"), 760); } }
    });
    icons();
  }

  function apptDetailHtml(a, sheetMode) {
    const m = musteriBul(a.mid || a.musteri), np = nextPlanned();
    const act = a.durum === "planned"
      ? `<button class="geldi" data-geldi="${a.i}" aria-label="${esc(a.musteri)}: Geldi olarak işaretle"><span class="lbl">${ic("user-check")}<span>Geldi</span></span></button>`
      : a.durum === "arrived" ? `<button class="btn btn-bordered" data-undo="${a.i}" data-toast-undo>${ic("undo-2")}Geri al</button>` : "";
    return `<div class="ap ${sheetMode ? "ap-sheet" : ""}">
      <div class="ap-h">${mono(a.musteri, sheetMode ? "mono-lg" : "")}<div style="min-width:0"><div class="ap-name trunc">${a.musteri}</div><div class="ap-sub trunc">${a.hizmet}</div></div></div>
      <dl><dt>Saat</dt><dd class="num">${a.saat} – ${a.bitis}</dd><dt>Uzman</dt><dd>${PERS[a.uzman].ad}</dd>${a.seans ? `<dt>Seans</dt><dd class="num">${a.seans}</dd>` : ""}<dt>Durum</dt><dd>${a === np ? "Sıradaki" : DURUM_AD[a.durum]}${a.geldi ? ` · ${a.geldi}` : ""}</dd></dl>
      <div class="ap-acts">${act}<a class="btn btn-bordered" href="#musteriler/${encodeURIComponent(m.id)}">Müşteri kartı</a></div></div>`;
  }
  function openAppt(anchor, i) {
    const a = S.appts[i];
    if (isPhone()) { openSheet(a.musteri, apptDetailHtml(a, true), { detents: [0.5], kind: "appt", i }); return; }
    openPopover(anchor, apptDetailHtml(a), { width: 300, align: "center", label: `${a.musteri} randevusu`, kind: "appt", i });
  }

  /* ---------- Geldi: düğme, satır, blok, sayaç ve bildirim aynı karede ---------- */
  function markArrived(i, e) {
    const a = S.appts[i];
    if (!a || a.durum !== "planned") return;
    // satırdaki küçük düğmede de dolgu basılan noktadan yayılsın, sonra satır yeşersin
    const rowBtn = e && e.target && e.target.closest && e.target.closest(".appt .geldi");
    a.durum = "arrived"; a.geldi = SIMDI;
    haptic(e, 12);
    announce(`${a.musteri} geldi olarak işaretlendi.`);
    const fromHero = Next.shown === i && $("#next");
    Next.arrived(i, e);
    const after = () => {
      if (!fromHero) drawTodayRows(i); else { const s = $("#todaySum"); if (s) s.textContent = sumText(); }
      refreshBlocks(i);
      refreshDetailViews();
    };
    if (rowBtn && !reduced()) { rowBtn.classList.add("is-done"); setTimeout(after, 360); } else after();
    if (pop && pop.kind === "appt") refreshPopover(apptDetailHtml(S.appts[pop.i]));
    if (sheet && sheet.kind === "appt") closeSheet();
    toast(`${a.musteri} geldi`, { icon: "user-check", action: { label: "Geri al", run: () => undoArrived(i) } });
  }
  function undoArrived(i, { toastIt } = {}) {
    const a = S.appts[i];
    if (!a || a.durum !== "arrived") return;
    a.durum = "planned"; delete a.geldi;
    announce(`${a.musteri} için Geldi geri alındı.`);
    if ($("#next")) Next.sync(); else drawTodayRows();
    refreshBlocks();
    refreshDetailViews();
    if (pop && pop.kind === "appt") refreshPopover(apptDetailHtml(S.appts[pop.i]));
    if (toastIt) toast(`${a.musteri} için Geldi geri alındı`, { icon: "undo-2" });
  }

  function todayBodyHtml() { return S.view === "cizelge" && !isPhone() ? `<div class="group tl-group">${timelineHtml()}</div>` : `<div class="group today-list">${listViewHtml()}</div>`; }
  function mountToday() {
    const body = $("#todayBody"); if (!body) return;
    body.innerHTML = todayBodyHtml();
    if ($("#next")) { Next.render(); drawTodayRows(); } else { Next.shown = null; const s = $("#todaySum"); if (s) s.textContent = sumText(); }
    bindTimeline();
    icons();
  }
  function switchView(k, i, from) {
    S.view = k;
    try { localStorage.setItem("ef-gorunum", k); } catch (err) { /* yok say */ }
    closePopover();
    const body = $("#todayBody"); if (!body) return;
    const dir = i > from ? 1 : -1;
    mountToday();
    body.animate(reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: "none" }], { duration: reduced() ? 160 : SPRING.ms, easing: SPRING.css });
  }

  function todayHtml() {
    return `<section aria-labelledby="h-today" class="today">
      <div class="group-head"><h2 id="h-today">Bugünün programı</h2><span class="gh-sub" id="todaySum">${sumText()}</span>
        <span class="gh-end d-only">${segHtml("Görünüm", [{ k: "liste", l: "Liste" }, { k: "cizelge", l: "Çizelge" }], S.view, "seg-sm")}</span></div>
      <p class="sw-hint m-only">Geldi için satırı sağa kaydırın ya da satıra dokunun</p>
      <div id="todayBody"></div>
    </section>`;
  }

  function chartSvg() {
    const ph = isPhone();
    const W = ph ? 340 : 640, H = ph ? 210 : 236, padL = ph ? 46 : 52, padR = 8, padT = 26, padB = 30, plotH = H - padT - padB, plotW = W - padL - padR, max = 200000, step = 50000;
    const y = (v) => padT + plotH - (v / max) * plotH;
    let grid = "";
    for (let v = 0; v <= max; v += step) {
      grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--sep)" stroke-width="1"></line>
        <text x="${padL - 10}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="var(--label-2)">${v === 0 ? "₺0" : "₺" + v / 1000 + " B"}</text>`;
    }
    const slot = plotW / GELIR6.length, bw = ph ? 22 : 30;
    const bars = GELIR6.map((d, k) => {
      const x = padL + slot * k + slot / 2 - bw / 2, top = y(d.v), base = padT + plotH, r = 6;
      const path = `M${x},${base} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + bw - r},${top} Q${x + bw},${top} ${x + bw},${top + r} L${x + bw},${base} Z`;
      const lbl = k === GELIR6.length - 2 ? `<text x="${x + bw / 2}" y="${top - 8}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--label)">₺${Math.round(d.v / 1000)} B</text>`
        : d.kismi ? `<text x="${x + bw / 2}" y="${top - 8}" text-anchor="middle" font-size="12" fill="var(--label-2)">sürüyor</text>` : "";
      return `<g tabindex="0" role="img" aria-label="${d.ay}: ${tl(d.v)}${d.kismi ? ", ay sürüyor" : ""}" data-tip="${d.ay} · ${tl(d.v)}${d.kismi ? " · ay sürüyor" : ""}">
        <rect x="${padL + slot * k}" y="${padT}" width="${slot}" height="${plotH}" fill="transparent"></rect>
        <path class="bar" d="${path}" fill="var(--accent)" ${d.kismi ? 'fill-opacity="0.32"' : ""}></path>${lbl}
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--label-2)">${d.k}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Son 6 ay gelir">${grid}${bars}</svg>`;
  }

  function panelHtml() {
    const p = DONEM[S.donem];
    const donemler = [{ k: "bugun", l: "Bugün" }, { k: "hafta", l: "Bu Hafta" }, { k: "ay", l: "Bu Ay" }, { k: "yil", l: "Bu Yıl" }];
    return `<div class="page">
      <div class="title-row">
        <div><p class="eyebrow">${up("Perşembe, 5 Kasım")}</p><h1 class="large-title" id="lt">Genel Bakış</h1></div>
        ${segHtml("Dönem", donemler, S.donem, "seg-donem")}
      </div>
      <section class="group metrics" id="kpis" aria-label="Özet göstergeler">${panelKpis().map(metricHtml).join("")}</section>
      <p class="ctx-cap t-2w" id="ctxCap">Değişim: ${p.kars}</p>

      <div class="grid-2">
        ${todayHtml()}
        <div class="stack">
          <section aria-labelledby="h-opp">
            <div class="group-head"><h2 id="h-opp">Gelir Fırsatları</h2><span class="gh-sub">53 müşteri</span></div>
            <div class="group">${FIRSAT.map((f) => `<a class="row" href="#firsatlar" style="--inset:48px">${ic(f.i, "glyph")}<div class="row-main"><div class="row-title">${f.l}</div><div class="row-sub">${f.d}</div></div><div class="row-end"><span class="count">${f.n}</span>${ic("chevron-right", "chev")}</div></a>`).join("")}</div>
          </section>
          <section aria-labelledby="h-debt">
            <div class="group-head"><h2 id="h-debt">Açık borç</h2><span class="gh-sub">${ALACAK.musteri} müşteri</span><span class="gh-end num fw6 t-red" style="font-size:15px">${tl(ALACAK.toplam)}</span></div>
            <div class="group">${BORCLU.map((b) => `<a class="row" href="${b.mid ? "#musteriler/" + b.mid : "#cari"}" style="--inset:60px">${mono(b.ad, "mono-sm")}<div class="row-main"><div class="row-title">${b.ad}</div>${b.gecikmis ? `<div class="state t-red" style="font-size:12px">${ic("circle-alert")}Gecikmiş</div>` : ""}</div><div class="row-end"><span class="num t-red" style="font-size:15px;font-weight:600">${tl(b.borc)}</span>${ic("chevron-right", "chev")}</div></a>`).join("")}
              <a class="row row-foot" href="#cari"><span class="row-main">${ALACAK.kalanMusteri} müşteri daha · ${tl(ALACAK.kalanTutar)}</span><span class="link">Cari Hesap</span>${ic("chevron-right", "chev")}</a></div>
          </section>
        </div>
      </div>

      <div class="grid-2">
        <section aria-labelledby="h-rev">
          <div class="group-head"><h2 id="h-rev">Aylık gelir</h2><span class="gh-sub">Son 6 ay · toplam ${tl(850400)}</span></div>
          <div class="group chart">${chartSvg()}</div>
        </section>
        <section aria-labelledby="h-new">
          <div class="group-head"><h2 id="h-new">Son eklenen müşteriler</h2><span class="gh-sub">Bu ay 18</span><a class="link gh-end" href="#musteriler">Müşteriler${ic("chevron-right")}</a></div>
          <div class="group">${SON_EKLENEN.map((c) => `<a class="row" href="${c.mid ? "#musteriler/" + c.mid : "#musteriler"}" style="--inset:60px">${mono(c.ad, "mono-sm")}<div class="row-main"><div class="row-title">${c.ad}</div></div><span class="row-sub">${c.tarih}</span>${ic("chevron-right", "chev")}</a>`).join("")}</div>
        </section>
      </div>
    </div>`;
  }
  function afterPanel() {
    mountToday();
    segmented($(".seg-donem"), changePeriod);
    segmented($(".today .seg"), switchView);
  }

  /* ======================================================================
     Müşteriler
     ====================================================================== */
  const tags = (m) => m.etiket.map((t) => `<span class="tag">${t}</span>`).join("");

  function pkgCell(m) {
    if (!m.toplam) return `<div class="c-main">${m.hizmet}</div><div class="c-sub">Tek seans</div>`;
    const done = m.toplam - m.kalan;
    const cls = m.kalan === 0 ? "is-done" : m.kalan <= 2 ? "is-low" : "";
    const right = m.kalan === 0 ? `<span class="t-orange fw6">Bitti</span>` : m.kalan <= 2 ? `<span class="t-orange fw6">${m.kalan} kaldı</span>` : `${done}/${m.toplam}`;
    return `<div class="pkg"><div class="pkg-top"><span class="c-main">${m.hizmet}</span><span class="c-sub num">${right}</span></div>
      <span class="bar-track ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="${m.toplam}" aria-valuenow="${done}" aria-label="${m.hizmet}: ${done}/${m.toplam} seans"><span style="width:${(done / m.toplam) * 100}%"></span></span></div>`;
  }
  const nextCell = (m) => (m.sira ? `<div class="c-main ${m.sira.gun === "Bugün" ? "fw6" : ""}">${m.sira.gun} ${m.sira.saat}</div><div class="c-sub">${m.sira.uzman}</div>` : `<div class="c-sub">Randevu yok</div>`);
  const valueCell = (m) =>
    `<div class="c-main num">${tl(m.deger)}</div>${m.borc ? `<div class="c-sub num fw6 t-red">${tl(m.borc)} ${m.gecikmis ? "gecikmiş" : "borç"}</div>` : `<div class="c-sub">${m.randevu} randevu</div>`}`;
  const statusHtml = (d) => (d === "new" ? `<span class="status new"><span class="dot"></span>Yeni</span>` : d === "passive" ? `<span class="status passive"><span class="dot"></span>Pasif</span>` : d === "archived" ? `<span class="status passive"><span class="dot"></span>Arşiv</span>` : `<span class="status"><span class="dot"></span>Aktif</span>`);

  function sortTh(k, l, cls = "") {
    const s = S.list.sort, on = s.k === k;
    const aria = on ? (s.dir > 0 ? "ascending" : "descending") : "none";
    return `<th class="${cls}" aria-sort="${aria}"><button class="th-sort" data-sort="${k}">${l}${ic(on && s.dir < 0 ? "chevron-up" : "chevron-down")}</button></th>`;
  }

  function emptyHtml() {
    const L = S.list;
    const why = L.q ? `“${esc(L.q)}” ile eşleşen müşteri yok. Yazımı kontrol edin ya da telefonun son 4 hanesiyle arayın.` : `Seçili ${nFilters() > 1 ? "filtrelere" : "filtreye"} uyan müşteri yok.`;
    return `<div class="empty">${ic("search")}<h3>Sonuç yok</h3><p>${why}</p><button class="btn btn-bordered" data-clearall>${L.q ? "Aramayı temizle" : "Filtreleri temizle"}</button></div>`;
  }

  function listHtml(r) {
    if (!r.length) return emptyHtml();
    const L = S.list;
    const table = `<div class="d-only tbl-pad"><table class="tbl" role="grid" aria-label="Müşteri listesi" aria-multiselectable="${L.selecting}">
      <thead><tr>${L.selecting ? `<th class="c-check"><span class="sr">Seç</span></th>` : ""}${sortTh("ad", "Müşteri")}<th>Paket</th><th>Sıradaki Randevu</th><th>Durum</th>${sortTh("iletisim", "Son İletişim", "col-contact")}${sortTh("deger", "Değer", "r")}</tr></thead>
      <tbody>${r.map((m) => {
        const sel = m.id === L.selId;
        return `<tr data-id="${m.id}" tabindex="${sel ? 0 : -1}" aria-selected="${sel}">
          ${L.selecting ? `<td class="c-check"><input type="checkbox" class="check" data-pick="${m.id}" aria-label="${m.ad} seç" ${L.picked.has(m.id) ? "checked" : ""}></td>` : ""}
          <td><div class="c-who">${mono(m.ad)}<div style="min-width:0"><div class="c-name"><span>${m.ad}</span>${tags(m)}</div><div class="c-sub num">${m.tel}</div></div></div></td>
          <td>${pkgCell(m)}</td>
          <td>${nextCell(m)}</td>
          <td>${statusHtml(m.durum)}</td>
          <td class="col-contact"><div class="c-main">${m.iletisim.ne}</div><div class="c-sub">${m.iletisim.tur}</div></td>
          <td class="r">${valueCell(m)}</td></tr>`;
      }).join("")}</tbody></table></div>`;
    const mlist = `<ul class="m-list m-only" aria-label="Müşteri listesi">${r.map((m) => {
      const pk = m.toplam ? (m.kalan === 0 ? "Paket bitti" : `${m.kalan} seans kaldı`) : "Tek seans";
      const debt = m.borc ? `<div class="state t-red m-debt">${ic("circle-alert")}${tl(m.borc)} ${m.gecikmis ? "gecikmiş borç" : "açık borç"}</div>` : "";
      return `<li class="sw" data-mid="${m.id}"><div class="sw-acts trail"><button class="sa gray" data-call="${m.id}" tabindex="-1" aria-hidden="true">${ic("phone")}Ara</button><button class="sa accent" data-pay="${m.id}" tabindex="-1" aria-hidden="true">${ic("banknote")}Ödeme al</button></div>
        <div class="sw-c"><a class="row" href="#musteriler/${m.id}">${mono(m.ad)}<div class="row-main">
        <div class="m-line"><span class="row-title"><span>${m.ad}</span>${tags(m)}</span><span class="v t-2">${tl(m.deger)}</span></div>
        <div class="row-sub">${m.hizmet} · ${pk}</div>${debt}</div>${ic("chevron-right", "chev")}</a></div></li>`;
    }).join("")}</ul>`;
    const total = SCOPES.find((s) => s.k === L.scope).n;
    const foot = `<div class="list-foot"><span class="trunc">${r.length} / ${nf(total)} müşteri</span><button class="btn btn-bordered btn-sm" data-demo="Taslakta ${r.length} örnek müşteri var">Daha fazla göster</button></div>`;
    return table + mlist + (L.q || nFilters() ? "" : foot);
  }

  function kv(k, v, end = "") {
    return `<div class="row"><div class="row-main kv"><span class="k">${k}</span>${v}</div>${end ? `<div class="row-end">${end}</div>` : ""}</div>`;
  }

  function detailHtml(m) {
    const o = oneri(m);
    const sub = [m.hizmet, ...m.etiket].join(" · ");
    const done = m.toplam ? m.toplam - m.kalan : 0;
    const ap = apptOf(m.ad);
    const arrived = ap && ap.durum === "arrived" ? ap.geldi : null;
    const today = !!(m.sira && m.sira.gun === "Bugün" && ap && (ap.durum === "planned" || ap.durum === "arrived"));
    const arriveEnd = today ? (arrived ? `<button class="btn btn-plain btn-sm" data-undo="${ap.i}">${ic("undo-2")}Geri al</button>` : `<button class="geldi geldi-sm" data-geldi="${ap.i}" aria-label="${esc(m.ad)}: Geldi olarak işaretle"><span class="lbl">${ic("user-check")}<span>Geldi</span></span></button>`) : "";
    const arrivedLine = today && arrived ? `<span class="state t-green" style="margin-top:3px">${ic("circle-check")}Geldi · ${arrived}</span>` : "";
    const pkgV = m.toplam
      ? `<span class="v">${m.hizmet} · ${done}/${m.toplam} seans</span><span class="bar-track ${m.kalan === 0 ? "is-done" : m.kalan <= 2 ? "is-low" : ""}" style="margin-top:7px" aria-hidden="true"><span style="width:${(done / m.toplam) * 100}%"></span></span>`
      : `<span class="v">${m.hizmet} · tek seans</span>`;
    const pkgEnd = m.toplam ? (m.kalan === 0 ? `<span class="state t-orange">Bitti</span>` : `<span class="state ${m.kalan <= 2 ? "t-orange" : "t-2"}" style="${m.kalan <= 2 ? "" : "font-weight:500"}">${m.kalan} kaldı</span>`) : "";
    const actMap = { pay: `data-pay="${m.id}"`, paket: `data-demo="Taslak: ${esc(m.ad)} için paket satış formu açılır"`, wa: `data-demo="WhatsApp sohbeti açılır"`, randevu: `data-demo="Taslak: ${esc(m.ad)} için randevu formu açılır"` };
    return `<div class="insp-head">
        ${mono(m.ad, "mono-xl")}
        <h2 class="insp-name">${m.ad}</h2>
        <p class="insp-sub">${sub}</p>
        <div class="quick">
          <button data-demo="Taslak: ${esc(m.ad)} için randevu formu açılır" aria-label="Randevu oluştur">${ic("calendar-plus")}Randevu</button>
          <button data-pay="${m.id}">${ic("banknote")}Ödeme al</button>
          <button data-demo="WhatsApp sohbeti açılır">${ic("message-circle")}WhatsApp</button>
          <button data-demo="${m.tel} aranıyor">${ic("phone")}Ara</button>
        </div>
      </div>
      ${o ? `<section class="insp-sec" style="margin-top:4px"><div class="group suggest tone-${o.tone}">${ic(o.i, "glyph")}<p class="long">${o.t}</p><button class="btn btn-tinted btn-sm" ${actMap[o.act]}>${o.cta}</button></div></section>` : ""}
      <section class="insp-sec"><div class="group">
        ${kv("Sıradaki randevu", `<span class="v ${today ? "fw6" : ""}">${m.sira ? `${m.sira.gun} ${m.sira.saat} · ${m.sira.uzman}` : "Planlı randevu yok"}</span>${arrivedLine}`, arriveEnd)}
        ${kv("Paket", pkgV, pkgEnd)}
        ${m.borc ? kv("Açık borç", `<span class="v num fw6 t-red">${tl(m.borc)}</span>`, m.gecikmis ? `<span class="state t-red">${ic("circle-alert")}Gecikmiş</span>` : "") : ""}
        ${kv("Toplam ödeme", `<span class="v num">${tl(m.deger)} · ${m.randevu} randevu</span>`)}
      </div></section>
      <section class="insp-sec"><h3>İletişim</h3><div class="group">
        ${kv("Telefon", `<a class="v num" href="tel:${m.tel.replace(/\s/g, "")}" data-demo="${m.tel} aranıyor">${m.tel}</a>`)}
        ${kv("E-posta", `<a class="v" href="mailto:${m.eposta}" data-demo="E-posta uygulaması açılır">${m.eposta}</a>`)}
        ${kv("Son iletişim", `<span class="v">${m.iletisim.ne} · ${m.iletisim.tur}</span>`)}
      </div></section>
      <section class="insp-sec"><h3>Son etkinlik</h3><div class="group">${etkilesimler(m).map((e) => `<div class="row act-row" style="--inset:48px">${ic(e.i, "glyph")}<div class="row-main"><p class="row-title long">${e.t}</p></div><span class="row-sub">${e.z}</span></div>`).join("")}</div></section>
      <p style="text-align:center;margin-top:14px"><a class="link" href="#musteriler" data-demo="Taslak: müşterinin tüm geçmişi açılır">Tüm geçmişi gör${ic("chevron-right")}</a></p>`;
  }

  function musterilerHtml() {
    const mk = [
      { l: "Aktif müşteri", v: nf(SAYIM.aktif), d: 4, ctx: "geçen aya göre" },
      { l: "Seans", v: "52", d: 8, ctx: "bu ay" },
      { l: "Yeni müşteri", v: "18", d: -5, ctx: "bu ay" },
      { l: "Açık borç", v: tl(ALACAK.toplam), flag: `${ALACAK.gecikmis} gecikmiş`, ctx: `${ALACAK.musteri} müşteri`, ctxDesk: true, href: "#cari" },
    ];
    return `<div class="page">
      <div class="title-row"><div><h1 class="large-title" id="lt">Müşteriler</h1><p class="lt-sub d-only">Toplam ${nf(SAYIM.toplam)} müşteri</p></div></div>
      <section class="group metrics" aria-label="Müşteri özeti">${mk.map(metricHtml).join("")}</section>
      <div class="m-tokens m-only" id="mtokens">${tokensHtml()}</div>
      <div class="scope-row">
        ${segHtml("Müşteri durumu", SCOPES, S.list.scope)}
        <div class="scope-trail"><span class="result" id="result"></span><button class="btn btn-plain" data-select>${S.list.selecting ? "Bitti" : "Seç"}</button></div>
      </div>
      <p class="sw-hint m-only">Ara ve Ödeme al için satırı sola kaydırın</p>
      <div class="split ${S.inspector ? "" : "no-insp"}" id="split">
        <div class="list-wrap"><div class="group" id="list"></div></div>
        <aside class="inspector" id="inspector" aria-label="Müşteri ayrıntısı"></aside>
      </div>
    </div>`;
  }

  function renderList() {
    const r = rows();
    const L = S.list;
    if (!r.find((m) => m.id === L.selId)) L.selId = r[0] ? r[0].id : null;
    $("#list").innerHTML = listHtml(r);
    if (isPhone()) $$("#list .m-list .sw").forEach((li) => bindSwipe(li, { trailW: 168 }));
    const res = $("#result");
    if (res) res.textContent = L.q || nFilters() ? `${r.length} sonuç` : "";
    renderInspector();
    renderBulk();
    icons();
  }

  function renderInspector() {
    const el = $("#inspector");
    if (!el) return;
    const m = S.list.selId && musteriBul(S.list.selId);
    el.innerHTML = m ? detailHtml(m) : `<div class="empty insp-empty">${ic("user-round")}<h3>Müşteri seçin</h3><p>Ayrıntıları görmek için listeden bir müşteri seçin.</p></div>`;
    icons();
  }

  function renderBulk() {
    let b = $("#bulk");
    const L = S.list;
    if (!L.selecting || S.route !== "musteriler") { b && b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.id = "bulk"; b.className = "bulk glass-strong"; b.setAttribute("role", "toolbar"); b.setAttribute("aria-label", "Seçili müşteriler"); document.body.append(b); }
    const n = L.picked.size, dis = n ? "" : "disabled";
    b.innerHTML = `<span class="n">${n} seçili</span>
      <button class="btn btn-plain" ${dis} data-demo="Taslak: etiket seçici açılır">${ic("tag")}Etiket ekle</button>
      <button class="btn btn-plain" ${dis} data-demo="Taslak: hatırlatma şablonu seçilir">${ic("bell")}Hatırlatma</button>
      <button class="btn btn-plain" ${dis} data-demo="${n} müşteri Excel dosyası olarak indirildi">${ic("download")}Dışa aktar</button>
      <button class="btn btn-plain" ${dis} data-archive style="color:var(--red-text)">${ic("archive")}Arşivle</button>
      <span class="tb-sep"></span><button class="btn btn-bordered" data-select>Bitti</button>`;
    $$("button[disabled]", b).forEach((x) => (x.style.opacity = ".4"));
    icons();
  }

  /* ======================================================================
     Menü (yalnızca telefonda: sekme çubuğunun "Menü" sekmesi)
     ====================================================================== */
  function menuHtml() {
    const row = (it) => `<a class="row" href="#${it.k}" style="--inset:50px">${ic(it.i, "glyph")}<div class="row-main"><div class="row-title">${it.l}</div></div>${it.alert ? `<span class="sb-alert" aria-label="${it.tip}">${it.alert}</span>` : it.count ? `<span class="count">${it.count}</span>` : ""}${ic("chevron-right", "chev")}</a>`;
    return `<div class="page menu-page">
      <div class="title-row"><h1 class="large-title" id="lt">Menü</h1></div>
      <div class="group"><button class="row" data-demo="İşletme ve hesap menüsü açılır" style="--inset:60px"><span class="sb-logo" aria-hidden="true">N</span><div class="row-main"><div class="row-title fw6">Nur Güzellik</div><div class="row-sub">Elif Kaya · İşletme sahibi</div></div>${ic("chevron-right", "chev")}</button></div>
      ${NAV.map((g) => `<section style="margin-top:24px">${g.label ? `<div class="group-head"><h2>${g.label}</h2></div>` : ""}<div class="group">${g.items.map(row).join("")}</div></section>`).join("")}
      <section style="margin-top:24px"><div class="group">${row(AYARLAR)}</div></section>
    </div>`;
  }

  /* ======================================================================
     Yönlendirme ve çizim
     ====================================================================== */
  let titleObs = null, booted = false, pushFromList = false;
  const post = (m) => { try { parent.postMessage(m, "*"); } catch (e) { /* yok say */ } };

  function renderRoute() {
    const r = S.route;
    if (document.body.classList.contains("is-searching")) { document.body.classList.remove("is-searching"); const mr = $("#mresults"); if (mr) { mr.classList.remove("has-content"); mr.innerHTML = ""; } }
    $("#sb-slot").innerHTML = sidebarHtml(r);
    $("#toolbar").innerHTML = toolbarHtml(r);
    const main = $("#main");
    main.innerHTML = r === "panel" ? panelHtml() : r === "musteriler" ? musterilerHtml() : menuHtml();
    document.title = `${TITLES[r]} · Yön E+F`;
    if (r === "panel") afterPanel(); else { Next.shown = null; TL = null; }
    if (r === "musteriler") { renderList(); segmented($(".scope-row .seg"), changeScope); }
    renderBulk();
    icons();
    watchSidebar();
    moveLens(r, !booted);
    window.scrollTo(0, 0);
    onScroll();
    if (booted) main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    if (titleObs) titleObs.disconnect();
    const lt = $("#lt");
    if (lt && "IntersectionObserver" in window) {
      titleObs = new IntersectionObserver(([e]) => $("#toolbar").classList.toggle("show-title", !e.isIntersecting), { rootMargin: `-${isPhone() ? 56 : 60}px 0px 0px 0px` });
      titleObs.observe(lt);
    }
    post({ type: "route", route: r });
  }

  function changeScope(k, i, from) {
    S.list.scope = k; S.list.picked.clear();
    renderList();
    const l = $("#list");
    if (l) l.animate(reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateX(${(i > from ? 1 : -1) * 12}px)` }, { opacity: 1, transform: "none" }], { duration: reduced() ? 160 : 300, easing: SPRING.css });
  }

  function onHash() {
    const raw = decodeURIComponent(location.hash.slice(1)) || "panel";
    let [r, id] = raw.split("/");
    if (r === "menu" && !isPhone()) r = "panel";
    if (!TITLES[r]) {
      const label = (ALL_NAV.find((n) => n.k === r) || {}).l || "Bu sayfa";
      toast(`${label} bu taslakta çizilmedi. Yön, Genel Bakış ve Müşteriler üzerinde gösteriliyor.`, { icon: "info" });
      history.replaceState(null, "", "#" + (S.route || "panel"));
      if (!S.route) { S.route = "panel"; renderRoute(); }
      return;
    }
    const prevRoute = S.route;
    closePopover(); closeSheet(); closeSbOverlay();
    if (r !== S.route) { closeSidePanel(); S.route = r; renderRoute(); }
    if (r === "musteriler") {
      if (id) {
        const m = musteriBul(id);
        if (!rows().find((x) => x.id === m.id)) { S.list.scope = scopeOf(m); S.list.q = ""; S.list.f = {}; renderRoute(); }
        S.list.selId = m.id;
        if (isPhone()) { pushFromList = prevRoute === "musteriler" && booted; openPush(m); }
        else { renderList(); focusRow(m.id, false); if (innerWidth < 1280) openSidePanel(m); }
      } else closePush();
    } else closePush();
  }

  /* ---------------- Kaydırma: araç çubuğu kenar efekti ---------------- */
  function onScroll() {
    const tb = $("#toolbar");
    if (tb) tb.classList.toggle("is-scrolled", window.scrollY > 2);
  }
  addEventListener("scroll", onScroll, { passive: true });

  function watchSidebar() {
    $$(".sidebar").forEach((sb) => {
      const nav = $(".sb-nav", sb);
      const upd = () => sb.classList.toggle("has-more", nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2);
      nav.addEventListener("scroll", upd, { passive: true });
      upd();
    });
  }

  /* Sekme çubuğu merceği: seçili sekmeye yayla kayar */
  let lensSp = null;
  function moveLens(route, instant) {
    const bar = $("#tabbar"); if (!bar) return;
    $$(".tab", bar).forEach((t) => (t.getAttribute("href") === "#" + route ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current")));
    if (!isPhone()) return;
    const lens = $(".tab-lens", bar), tab = $(`.tab[href="#${route}"]`, bar);
    if (!tab) { lens.style.opacity = "0"; return; }
    lens.style.opacity = "1"; lens.style.width = tab.offsetWidth + "px";
    if (!lensSp) lensSp = new Spring(tab.offsetLeft, { precision: 0.2, onUpdate: (v) => { lens.style.transform = `translateX(${v}px)`; } });
    if (instant) lensSp.jump(tab.offsetLeft); else lensSp.to(tab.offsetLeft, { response: 0.36, damping: 1 });
  }

  /* ======================================================================
     Katmanlar — tetikleyicisinden açılır, geldiği yoldan kapanır; hepsi yayla
     ====================================================================== */
  const layers = $("#layers");

  /* --- Açılır menü: tetikleyiciden büyür (dönüşüm merkezi = tetikleyici), aynı yoldan söner --- */
  let pop = null, popClosing = null;
  const applyPop = (el, p) => {
    el.style.opacity = clamp(p * 1.6, 0, 1);
    el.style.transform = `scale(${0.9 + 0.1 * p})`;
    el.style.filter = p < 0.985 ? `blur(${((1 - p) * 6).toFixed(2)}px)` : "none";
  };
  function placePop(el, anchor, align) {
    const r = anchor.getBoundingClientRect(), pw = el.offsetWidth, ph = el.offsetHeight;
    let left = align === "end" ? r.right - pw : align === "center" ? r.left + r.width / 2 - pw / 2 : r.left;
    left = clamp(left, 8, innerWidth - pw - 8);
    let top = r.bottom + 6, above = false;
    if (top + ph > innerHeight - 8 && r.top - 6 - ph > 8) { top = r.top - 6 - ph; above = true; }
    top = clamp(top, 8, Math.max(8, innerHeight - ph - 8));
    el.style.left = left + "px"; el.style.top = top + "px";
    el.style.transformOrigin = `${clamp(r.left + r.width / 2 - left, 0, pw)}px ${above ? ph : 0}px`;
  }
  function openPopover(anchor, html, o = {}) {
    if (popClosing && popClosing.anchor === anchor) {
      // kapanırken yeniden istendi: aynı öğe anlık değerinden geri döner
      pop = popClosing; popClosing = null;
      pop.el.style.pointerEvents = ""; pop.el.innerHTML = html; icons();
      Object.assign(pop, { kind: o.kind, i: o.i });
      pop.sp.to(1, { response: 0.32, damping: 1 });
      anchor.setAttribute("aria-expanded", "true");
      return pop.el;
    }
    closePopover(true);
    const el = document.createElement("div");
    el.className = "popover glass-strong";
    el.setAttribute("role", "dialog");
    if (o.label) el.setAttribute("aria-label", o.label);
    el.style.width = (o.width || 300) + "px";
    el.innerHTML = html;
    layers.append(el);
    icons();
    placePop(el, anchor, o.align || "end");
    const sp = new Spring(0, { precision: 0.001, onUpdate: (p) => applyPop(el, p) });
    applyPop(el, 0);
    pop = { el, anchor, sp, align: o.align || "end", kind: o.kind, i: o.i };
    anchor.setAttribute("aria-expanded", "true");
    if (reduced()) { sp.jump(1); fade(el, true); } else sp.to(1, { response: 0.32, damping: 1 });
    return el;
  }
  function refreshPopover(html) {
    if (!pop) return;
    pop.el.innerHTML = html; icons();
    if (!pop.anchor.isConnected && pop.kind === "appt") {
      // tetikleyici yeniden çizildiyse yenisine bağlan; konum sıçramasın
      const na = $(`.blk[data-blk="${pop.i}"]`) || $(`.appt[data-appt="${pop.i}"]`);
      if (na) { pop.anchor = na; na.setAttribute("aria-expanded", "true"); }
    }
    if (pop.anchor.isConnected) placePop(pop.el, pop.anchor, pop.align);
  }
  function closePopover(instant) {
    if (!pop) return;
    const P = pop; pop = null;
    P.anchor.setAttribute && P.anchor.setAttribute("aria-expanded", "false");
    if (instant || !P.el.isConnected) { P.sp.stop(); P.el.remove(); return; }
    if (popClosing && popClosing !== P) { popClosing.sp.stop(); popClosing.el.remove(); }
    popClosing = P;
    P.el.style.pointerEvents = "none";
    if (reduced()) { fade(P.el, false, () => { P.el.remove(); if (popClosing === P) popClosing = null; }); return; }
    P.sp.to(0, { response: 0.24, damping: 1, onRest: () => { P.el.remove(); if (popClosing === P) popClosing = null; } });
  }

  /* Arka planı geri it: ilerlemeye bağlı, sürüklerken de sürekli */
  function pushBack(p) {
    const m = $(".main-col"); if (!m) return;
    if (p <= 0.001 || reduced()) { m.style.transform = ""; m.style.filter = ""; return; }
    m.style.transformOrigin = `50% ${scrollY + innerHeight / 2}px`;
    m.style.transform = `translateY(${(p * 8).toFixed(2)}px) scale(${(1 - 0.06 * p).toFixed(4)})`;
  }

  /* --- Alt sayfa: kademeler, 1:1 sürükleme, ivme yansıtması, lastik bant --- */
  let sheet = null;
  function openSheet(title, body, o = {}) {
    closePopover(true);
    if (sheet) closeSheet(0, true);
    const detents = o.detents || [0.62, 0.92];
    const H = innerHeight, maxD = Math.max(...detents), sh = Math.round(H * maxD) - 8;
    const snaps = detents.map((d) => sh - (Math.round(H * d) - 8));
    const closedY = sh + 30, openY = Math.min(...snaps);
    const scrim = document.createElement("div"); scrim.className = "scrim";
    const el = document.createElement("div");
    el.className = "sheet glass-strong";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.style.height = sh + "px";
    const bar = o.kind === "filter"
      ? `<button class="glass-btn glass" data-sheet-cancel aria-label="Vazgeç">${ic("x")}</button><h2>${title}</h2><button class="glass-btn btn-prominent" data-sheet-done aria-label="Bitti">${ic("check")}</button>`
      : `<button class="glass-btn glass" data-sheet-done aria-label="Kapat">${ic("x")}</button><h2 class="trunc">${title}</h2><span></span>`;
    el.innerHTML = `<div class="sheet-grab" aria-hidden="true"></div><div class="sheet-bar">${bar}</div><div class="sheet-body">${body}</div>`;
    layers.append(scrim, el);
    icons();
    const render = (y) => {
      el.style.transform = `translateY(${y.toFixed(2)}px)`;
      const p = clamp(1 - y / sh, 0, 1);
      scrim.style.opacity = p;
      pushBack(clamp((p - 0.2) / 0.8, 0, 1) * (maxD > 0.8 ? 1 : 0.6));
    };
    const y = new Spring(closedY, { precision: 0.4, onUpdate: render });
    y.jump(closedY);
    sheet = { el, scrim, y, sh, closedY, kind: o.kind, i: o.i, opener: document.activeElement };
    if (reduced()) { y.jump(snaps[0]); fade(el, true); fade(scrim, true); }
    else y.to(snaps[0], { response: 0.38, damping: 1 });
    let base = 0;
    [el.querySelector(".sheet-grab"), el.querySelector(".sheet-bar")].forEach((z) => drag(z, {
      axis: "y", threshold: 4,
      canStart: (e) => !e.target.closest("button"),
      onStart: () => { y.stop(); base = y.x; },
      onMove: (d) => { let t = base + d; if (t < openY) t = openY + rubber(t - openY, H); y.jump(t); },
      onEnd: (d, v) => {
        const target = nearest([...snaps, closedY], y.x + project(v));
        if (target === closedY) { closeSheet(v); return; }
        y.to(target, { velocity: v, response: 0.3, damping: Math.abs(v) > 300 ? 0.8 : 1 });
      },
    }));
    scrim.addEventListener("click", () => closeSheet());
    // orta kademede içerik kaydırılırsa sayfa önce tam boya açılır (iOS davranışı)
    const bodyEl = el.querySelector(".sheet-body");
    const grow = () => { if (sheet && sheet.el === el && Math.abs(y.target - openY) > 1) y.to(openY, { response: 0.32, damping: 1 }); };
    bodyEl.addEventListener("scroll", grow, { passive: true });
    bodyEl.addEventListener("wheel", grow, { passive: true });
    setTimeout(() => { const f = el.querySelector("[data-sheet-done]"); f && f.focus({ preventScroll: true }); }, 60);
    return el;
  }
  function closeSheet(v = 0, instant) {
    if (!sheet) return;
    const SH = sheet; sheet = null;
    const done = () => { SH.el.remove(); SH.scrim.remove(); pushBack(0); };
    if (instant) { SH.y.stop(); done(); return; }
    SH.el.style.pointerEvents = "none"; SH.scrim.style.pointerEvents = "none";
    if (reduced()) { fade(SH.scrim, false); fade(SH.el, false, done); return; }
    SH.y.to(SH.closedY, { velocity: v, response: 0.3, damping: 1, onRest: done });
    SH.opener && SH.opener.isConnected && SH.opener.focus && SH.opener.focus({ preventScroll: true });
  }

  function filterMenuHtml(mobile) {
    const L = S.list;
    const secs = FDEF.map((d) => {
      const items = d.ops.map((o) => `<button class="pop-item" role="menuitemcheckbox" aria-checked="${L.f[d.k] === o.v}" data-f="${d.k}" data-v="${esc(o.v)}">${ic("check", "ck")}<span>${o.l}</span></button>`).join("");
      return mobile ? `<div class="pop-title">${d.l}</div><div class="group">${items}</div>` : `<div class="pop-sec" role="group" aria-label="${d.l}"><div class="pop-title">${d.l}</div>${items}</div>`;
    }).join("");
    const clear = nFilters() ? (mobile ? `<div style="text-align:center;margin-top:18px"><button class="btn btn-plain" data-clearf style="font-size:17px">Filtreleri temizle</button></div>` : `<div class="pop-foot"><button class="btn btn-plain btn-sm" data-clearf>Filtreleri temizle</button></div>`) : "";
    return secs + clear;
  }
  let filterSnapshot = null;
  function openFilter(anchor) {
    filterSnapshot = { ...S.list.f };
    if (isPhone()) openSheet("Filtrele", filterMenuHtml(true), { kind: "filter" });
    else openPopover(anchor, filterMenuHtml(false), { width: 280, align: "start", label: "Filtrele", kind: "filter" });
  }
  function refreshFilterUi() {
    if (pop && pop.kind === "filter") refreshPopover(filterMenuHtml(false));
    if (sheet && sheet.kind === "filter") { const b = $(".sheet-body", sheet.el), st = b.scrollTop; b.innerHTML = filterMenuHtml(true); b.scrollTop = st; icons(); }
    $("#toolbar").innerHTML = toolbarHtml(S.route);
    if (pop && pop.kind === "filter") { const a = $("#toolbar .tb-group [data-filter]"); if (a) { pop.anchor = a; a.setAttribute("aria-expanded", "true"); placePop(pop.el, a, pop.align); } }
    const mt = $("#mtokens"); if (mt) mt.innerHTML = tokensHtml();
    onScroll();
    $("#toolbar").classList.toggle("show-title", !!$("#lt") && $("#lt").getBoundingClientRect().bottom < 60);
    renderList();
  }

  /* Genel Bakış: araç çubuğundaki aramada öneriler (HIG › Search fields) */
  let sugSel = 0, sugItems = [];
  function showSuggest(input) {
    const q = input.value.trim().toLocaleLowerCase("tr");
    if (!q) { closePopover(); input.setAttribute("aria-expanded", "false"); return; }
    const qd = q.replace(/\D/g, "");
    const hits = MUSTERI.filter((m) => m.ad.toLocaleLowerCase("tr").includes(q) || (qd.length > 2 && m.tel.replace(/\D/g, "").includes(qd))).slice(0, 6);
    sugItems = hits.map((m) => ({ go: `#musteriler/${m.id}` })).concat([{ q: input.value.trim() }]);
    sugSel = Math.min(sugSel, sugItems.length - 1);
    const html = `<div id="suggest" role="listbox" aria-label="Öneriler">${hits.length ? `<div class="pop-title">Müşteriler</div>` : ""}${hits.map((m, k) => `<button class="pop-item ${k === sugSel ? "is-active" : ""}" role="option" aria-selected="${k === sugSel}" data-sug="${k}">${mono(m.ad)}<span class="trunc">${m.ad}</span><span class="sub">${m.tel}</span></button>`).join("")}
      ${hits.length ? "" : `<div class="pop-empty">“${esc(input.value.trim())}” ile eşleşen müşteri yok.</div>`}
      <div class="pop-sec"><button class="pop-item ${sugSel === sugItems.length - 1 ? "is-active" : ""}" role="option" data-sug="${sugItems.length - 1}">${ic("search", "")}<span class="trunc">Müşteriler'de ara: “${esc(input.value.trim())}”</span></button></div></div>`;
    const wrap = $("#gsearch-wrap");
    if (pop && pop.kind === "suggest") refreshPopover(html);
    else openPopover(wrap, html, { width: Math.max(320, wrap.offsetWidth), align: "end", label: "Arama önerileri", kind: "suggest" });
    input.setAttribute("aria-expanded", "true");
  }
  function runSuggest(k) {
    const it = sugItems[k];
    if (!it) return;
    closePopover();
    if (it.go) location.hash = it.go;
    else { S.list.q = it.q; S.list.f = {}; location.hash = "musteriler"; }
  }

  /* --- Telefonda itilen müşteri görünümü: sağdan gelir; sağa çekip bırakınca geri döner --- */
  let push = null;
  function openPush(m) {
    if (push && push.id === m.id) { refreshPush(); return; }
    if (push) { push.x.stop(); push.el.remove(); push = null; }
    const el = document.createElement("div");
    el.className = "push";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", m.ad);
    el.innerHTML = `<header class="toolbar"><div class="tb-lead"><button class="back glass" data-back>${ic("chevron-left")}Müşteriler</button></div><div class="tb-center"><span class="tb-title" aria-hidden="true">${m.ad}</span></div><div class="tb-trail"><button class="glass-btn glass" data-demo="Düzenle, paket sat, arşivle" aria-label="Diğer işlemler">${ic("ellipsis")}</button></div></header><div class="push-body">${detailHtml(m)}</div>`;
    layers.append(el);
    icons();
    const W = innerWidth, mc = $(".main-col");
    const x = new Spring(W, { precision: 0.3, onUpdate: (v) => {
      el.style.transform = `translateX(${v.toFixed(2)}px)`;
      const p = clamp(1 - v / W, 0, 1);
      if (mc) mc.style.transform = p > 0.001 && !reduced() ? `translateX(${(-p * W * 0.22).toFixed(2)}px)` : "";
    } });
    x.jump(W);
    push = { el, x, id: m.id };
    if (reduced()) { x.jump(0); fade(el, true); } else x.to(0, { response: 0.4, damping: 1 });
    const tb = $(".toolbar", el);
    el.addEventListener("scroll", () => { tb.classList.toggle("is-scrolled", el.scrollTop > 2); tb.classList.toggle("show-title", el.scrollTop > 110); }, { passive: true });
    let base = 0;
    drag(el, {
      axis: "x", threshold: 10,
      canDir: (d) => d > 0,
      onStart: () => { x.stop(); base = x.x; },
      onMove: (d) => { let t = base + d; if (t < 0) t = rubber(t, W); x.jump(t); },
      onEnd: (d, v) => {
        // bırakmada hızın işareti karar verir; yavaşsa yansıtılan konum
        if (v > 350 || (Math.abs(v) <= 350 && x.x + project(v) > W * 0.45)) leavePush(v);
        else x.to(0, { velocity: v, response: 0.34, damping: Math.abs(v) > 300 ? 0.85 : 1 });
      },
    });
    setTimeout(() => push && push.el === el && $("[data-back]", el).focus({ preventScroll: true }), 80);
  }
  function closePush(v = 0) {
    if (!push) return;
    const P = push; push = null;
    const done = () => { P.el.remove(); const mc = $(".main-col"); if (mc) mc.style.transform = ""; };
    if (reduced()) { fade(P.el, false, done); return; }
    P.x.to(innerWidth, { velocity: v, response: 0.34, damping: 1, onRest: done });
  }
  function leavePush(v = 0) {
    closePush(v);
    if (pushFromList) { pushFromList = false; history.back(); }
    else history.replaceState(null, "", "#musteriler");
  }
  function refreshPush() {
    if (!push) return;
    const st = push.el.scrollTop;
    $(".push-body", push.el).innerHTML = detailHtml(musteriBul(push.id));
    icons();
    push.el.scrollTop = st;
  }

  /* --- Orta genişlikte (768–1279) ayrıntı paneli: sağdan gelir, sağa fırlatılarak kapanır; perdesiz --- */
  let side = null;
  function openSidePanel(m) {
    if (!side) {
      const el = document.createElement("aside");
      el.className = "side-panel";
      el.setAttribute("aria-label", "Müşteri ayrıntısı");
      el.innerHTML = `<div class="side-h" title="Kapatmak için sağa sürükleyin"><span class="t-2" style="font-size:13px;font-weight:600">Müşteri ayrıntısı</span><button class="glass-btn glass" data-close-side aria-label="Müşteri ayrıntısını kapat">${ic("x")}</button></div><div class="side-b"></div>`;
      layers.append(el);
      const Wd = 416;
      const x = new Spring(Wd, { precision: 0.3, onUpdate: (v) => { el.style.transform = `translateX(${v.toFixed(2)}px)`; el.style.visibility = v >= Wd - 2 ? "hidden" : "visible"; } });
      x.jump(Wd);
      side = { el, x, Wd, id: null, open: false };
      let base = 0;
      drag($(".side-h", el), {
        axis: "x", threshold: 4,
        canStart: (e) => !e.target.closest("button"),
        onStart: () => { x.stop(); base = x.x; },
        onMove: (d) => { let t = base + d; if (t < 0) t = rubber(t, Wd); x.jump(t); },
        onEnd: (d, v) => {
          if (v > 350 || (Math.abs(v) <= 350 && x.x + project(v) > Wd * 0.45)) closeSidePanel(v);
          else x.to(0, { velocity: v, response: 0.32, damping: Math.abs(v) > 300 ? 0.8 : 1 });
        },
      });
    }
    side.id = m.id;
    const b = $(".side-b", side.el);
    b.innerHTML = detailHtml(m); b.scrollTop = 0; icons();
    if (side.open) b.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    side.open = true;
    if (reduced()) { side.x.jump(0); fade(side.el, true); } else side.x.to(0, { response: 0.36, damping: 1 });
  }
  function closeSidePanel(v = 0) {
    if (!side || !side.open) return;
    side.open = false;
    side.x.to(side.Wd, { velocity: v, response: 0.32, damping: 1 });
  }

  /* Kenar çubuğu: geniş ekranda gizle/göster; dar pencerede kendiliğinden gizli, düğmeyle üstte açılır */
  const sbOverlayOpen = () => innerWidth < 1100 && $("#frame") && $("#frame").classList.contains("sb-open");
  function toggleSidebar() {
    const f = $("#frame");
    if (innerWidth >= 1100) f.classList.toggle("sb-hidden");
    else f.classList.toggle("sb-open");
    setTimeout(watchSidebar, 300);
  }
  function closeSbOverlay() { const f = $("#frame"); f && f.classList.remove("sb-open"); }

  /* Ayrıntı bölmesi (≥1280): yayla açılır/kapanır; tablo genişliği aynı yayla esner */
  let inspSp = null;
  function toggleInspector(btn) {
    S.inspector = !S.inspector;
    btn && btn.setAttribute("aria-pressed", String(S.inspector));
    const split = $("#split"); if (!split) return;
    if (innerWidth < 1280 || reduced()) { split.classList.toggle("no-insp", !S.inspector); return; }
    split.classList.remove("no-insp"); split.classList.add("animating");
    if (!inspSp) inspSp = new Spring(S.inspector ? 0 : 1, { precision: 0.002, onUpdate: (p) => {
      const s = $("#split"), i = $("#inspector"); if (!s || !i) return;
      s.style.gridTemplateColumns = `minmax(0, 1fr) ${(368 * p).toFixed(1)}px`;
      s.style.columnGap = `${(24 * p).toFixed(1)}px`;
      i.style.opacity = clamp(p * 1.3 - 0.3, 0, 1);
      i.style.transform = `translateX(${((1 - p) * 30).toFixed(1)}px)`;
    } });
    inspSp.to(S.inspector ? 1 : 0, { response: 0.42, damping: 1, onRest: () => {
      const s = $("#split"), i = $("#inspector"); if (!s || !i) return;
      s.classList.remove("animating"); s.classList.toggle("no-insp", !S.inspector);
      s.style.gridTemplateColumns = ""; s.style.columnGap = ""; i.style.opacity = ""; i.style.transform = "";
    } });
  }

  /* Telefonda arama: düğme alanı klavyenin üstünde açar (HIG › Search fields › Search as a tab) */
  function openSearch() {
    document.body.classList.add("is-searching");
    const inp = $("#bsearch");
    inp.value = S.route === "musteriler" ? S.list.q : "";
    drawMobileResults();
    const bar = $(".m-searchbar");
    if (bar && !reduced()) bar.animate([{ transform: "scale(0.6)", opacity: 0, transformOrigin: "100% 50%" }, { transform: "none", opacity: 1, transformOrigin: "100% 50%" }], { duration: SPRING.ms, easing: SPRING.css });
    setTimeout(() => inp.focus(), 30);
  }
  function closeSearch() {
    if (!document.body.classList.contains("is-searching")) return;
    document.body.classList.remove("is-searching");
    if (S.route === "musteriler" && S.list.q) { S.list.q = ""; renderList(); }
    const r = $("#mresults"); r.classList.remove("has-content"); r.innerHTML = "";
  }
  function drawMobileResults() {
    const box = $("#mresults"), q = $("#bsearch").value.trim();
    if (S.route === "musteriler" || !q) { box.classList.remove("has-content"); box.innerHTML = ""; return; }
    const ql = q.toLocaleLowerCase("tr"), qd = ql.replace(/\D/g, "");
    const hits = MUSTERI.filter((m) => m.ad.toLocaleLowerCase("tr").includes(ql) || (qd.length > 2 && m.tel.replace(/\D/g, "").includes(qd))).slice(0, 6);
    box.innerHTML = hits.length
      ? `<div class="pop-title">Müşteriler</div>${hits.map((m) => `<button class="row" role="option" data-msug="${m.id}">${mono(m.ad)}<div class="row-main"><div class="row-title">${m.ad}</div><div class="row-sub num">${m.tel}</div></div>${ic("chevron-right", "chev")}</button>`).join("")}`
      : `<div class="pop-empty" style="padding:16px 18px">“${esc(q)}” ile eşleşen müşteri yok. Telefonun son 4 hanesini deneyin.</div>`;
    box.classList.add("has-content");
    icons();
  }

  function closeLayers() { closePopover(); closeSheet(); closeSidePanel(); closeSbOverlay(); }
  function refreshDetailViews() {
    if (S.route === "musteriler") renderInspector();
    refreshPush();
    if (side && side.open && side.id) { const b = $(".side-b", side.el), st = b.scrollTop; b.innerHTML = detailHtml(musteriBul(side.id)); b.scrollTop = st; icons(); }
  }

  /* --- Bildirim: alttan gelir, alta gider; aşağı fırlatarak kapanır; isteğe bağlı Geri al --- */
  let toastObj = null;
  function toast(text, o = {}) {
    if (typeof o === "string") o = { icon: o };
    const { icon = "circle-check", action, ms = 5200 } = o;
    if (toastObj) toastObj.dismiss(0, true);
    const el = document.createElement("div");
    el.className = "toast glass-strong";
    el.setAttribute("role", "status");
    el.innerHTML = `${ic(icon)}<span>${text}</span>${action ? `<button class="btn btn-tinted btn-sm" data-t>${ic("undo-2")}${action.label}</button>` : ""}<button class="tx" aria-label="Kapat" data-tclose>${ic("x")}</button>`;
    layers.append(el);
    icons();
    const mc = $(".main-col"), r = mc && !isPhone() ? mc.getBoundingClientRect() : { left: 0, width: innerWidth };
    el.style.left = r.left + r.width / 2 + "px";
    const y = new Spring(90, { precision: 0.3, onUpdate: (v) => { el.style.transform = `translate(-50%, ${v.toFixed(2)}px)`; el.style.opacity = clamp(1 - v / 90, 0, 1); } });
    y.jump(90);
    y.to(0, { response: 0.36, damping: 1 });
    let timer = 0;
    const T = {
      el, forI: o.forI,
      dismiss(v = 0, fast) {
        clearTimeout(timer);
        if (toastObj === T) toastObj = null;
        el.style.pointerEvents = "none";
        if (reduced()) { fade(el, false, () => el.remove()); return; }
        y.to(110, { velocity: v, response: fast ? 0.2 : 0.3, damping: 1, onRest: () => el.remove() });
      },
    };
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => T.dismiss(), ms); };
    arm();
    el.addEventListener("pointerenter", () => clearTimeout(timer));
    el.addEventListener("pointerleave", arm);
    el.addEventListener("focusin", () => clearTimeout(timer));
    if (action) el.querySelector("[data-t]").addEventListener("click", () => { T.dismiss(); action.run(); });
    el.querySelector("[data-tclose]").addEventListener("click", () => T.dismiss());
    let base = 0;
    drag(el, {
      axis: "y", threshold: 4,
      canStart: (e) => !e.target.closest("button"),
      onStart: () => { y.stop(); base = y.x; clearTimeout(timer); },
      onMove: (d) => { let t = base + d; if (t < 0) t = rubber(t, 60); y.jump(t); },
      onEnd: (d, v) => { if (y.x + project(v) > 36) T.dismiss(v); else { y.to(0, { velocity: v, response: 0.3, damping: 1 }); arm(); } },
    });
    toastObj = T;
    return T;
  }
  const announce = (msg) => { const l = $("#live"); l.textContent = ""; setTimeout(() => (l.textContent = msg), 30); };

  /* İpucu (macOS: üzerinde bekleyince kısa açıklama) */
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.setAttribute("role", "tooltip");
  document.body.append(tip);
  let tipTimer, tipEl = null;
  const showTip = (el) => {
    tipEl = el;
    tip.textContent = el.dataset.tip;
    tip.classList.add("is-open");
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, innerWidth - tw - 8)) + "px";
    tip.style.top = (r.bottom + th + 10 > innerHeight ? r.top - th - 8 : r.bottom + 8) + "px";
  };
  const hideTip = () => { clearTimeout(tipTimer); tipEl = null; tip.classList.remove("is-open"); };
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el === tipEl) return;
    hideTip();
    if (el) tipTimer = setTimeout(() => showTip(el), 450);
  });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); hideTip(); if (el && el.matches(":focus-visible")) showTip(el); });
  document.addEventListener("scroll", hideTip, true);

  /* ---------------- Tablo seçimi ve klavye ---------------- */
  function focusRow(id, focus = true) {
    const tr = $(`.tbl tr[data-id="${CSS.escape(id)}"]`);
    if (!tr) return;
    $$(".tbl tbody tr").forEach((x) => { x.setAttribute("aria-selected", String(x === tr)); x.tabIndex = x === tr ? 0 : -1; });
    if (focus) tr.focus({ preventScroll: false });
  }
  function selectRow(id, { focus = true } = {}) {
    const changed = S.list.selId !== id;
    S.list.selId = id;
    focusRow(id, focus);
    renderInspector();
    const insp = $("#inspector");
    if (insp) { insp.scrollTop = 0; if (changed && !reduced()) insp.animate([{ opacity: 0.25, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: SPRING.css }); }
    if (innerWidth < 1280 && !isPhone()) openSidePanel(musteriBul(id));
  }

  /* Disclosure: yükseklik yayla açılır ve aynı yoldan kapanır */
  function toggleEarlier(btn) {
    S.earlierOpen = !S.earlierOpen;
    btn.setAttribute("aria-expanded", String(S.earlierOpen));
    const box = $("#earlier"); if (!box) return;
    if (reduced()) { box.hidden = !S.earlierOpen; return; }
    if (box._anim) box._anim.cancel();
    const from = box.hidden ? 0 : box.getBoundingClientRect().height;
    box.hidden = false;
    const full = box.scrollHeight, to = S.earlierOpen ? full : 0;
    box.style.overflow = "hidden";
    box._anim = box.animate([{ height: from + "px", opacity: S.earlierOpen ? 0.4 : 1 }, { height: to + "px", opacity: S.earlierOpen ? 1 : 0.2 }], { duration: SPRING.ms, easing: SPRING.css });
    box._anim.onfinish = () => { box.style.overflow = ""; box._anim = null; if (!S.earlierOpen) box.hidden = true; };
  }

  /* ---------------- Olaylar ---------------- */
  // Basınca anında tepki: Geldi dolgusu basılan noktadan büyür
  document.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".geldi");
    if (g) { const r = g.getBoundingClientRect(); g.style.setProperty("--px", e.clientX - r.left + "px"); g.style.setProperty("--py", e.clientY - r.top + "px"); }
    if (pop && !pop.el.contains(e.target) && !pop.anchor.contains(e.target) && !e.target.closest("[data-filter]")) closePopover();
  }, true);

  document.addEventListener("click", (e) => {
    const t = e.target;
    const c = (s) => t.closest(s);
    let el;
    if (sbOverlayOpen() && ((!c(".sidebar") && !c("[data-toggle-sidebar]")) || c(".sb-item"))) closeSbOverlay();

    if ((el = c("[data-geldi]"))) { e.preventDefault(); const i = +el.dataset.geldi; if (el.closest(".sw")) el.closest(".sw")._sw?.close(); markArrived(i, e); return; }
    if ((el = c("[data-undo]"))) {
      e.preventDefault();
      const i = +el.dataset.undo;
      if (el.closest(".sw")) el.closest(".sw")._sw?.close();
      if (toastObj && toastObj.el.textContent.includes(S.appts[i].musteri)) toastObj.dismiss(0, true);
      undoArrived(i, { toastIt: !el.closest(".next") });
      return;
    }
    if ((el = c("[data-toggle-sidebar]"))) { toggleSidebar(); return; }
    if ((el = c("[data-close-side]"))) { closeSidePanel(); return; }
    if ((el = c("[data-group]"))) {
      const k = el.dataset.group; S.collapsed[k] = !S.collapsed[k];
      $$(`#sbg-${k}`).forEach((u) => (u.hidden = !!S.collapsed[k]));
      $$(`[data-group="${k}"]`).forEach((b) => b.setAttribute("aria-expanded", String(!S.collapsed[k])));
      watchSidebar();
      return;
    }
    if ((el = c("[data-earlier]"))) { toggleEarlier(el); return; }
    if ((el = c("[data-tl-now]"))) { TL && TL.now(); return; }
    if ((el = c("[data-blk]"))) { if (pop && pop.anchor === el) { closePopover(); return; } openAppt(el, +el.dataset.blk); return; }
    if ((el = c("[data-pay]"))) {
      e.preventDefault();
      const m = el.dataset.pay ? musteriBul(el.dataset.pay) : null;
      if (el.closest(".sw")) el.closest(".sw")._sw?.close();
      toast(m ? `Taslak: ${m.ad} için ödeme formu açılır${m.borc ? ` (açık borç ${tl(m.borc)})` : ""}` : "Taslak: ödeme formu açılır, önce müşteri seçilir", { icon: "banknote" });
      return;
    }
    if ((el = c("[data-call]"))) { e.preventDefault(); if (el.closest(".sw")) el.closest(".sw")._sw?.close(); const m = musteriBul(el.dataset.call); toast(`Taslak: ${m.ad} aranır · ${m.tel}`, { icon: "phone" }); return; }
    if ((el = c("[data-filter]"))) { if (pop && pop.kind === "filter") closePopover(); else openFilter(el); return; }
    if ((el = c("[data-f]"))) {
      const { f: k, v } = el.dataset;
      S.list.f[k] === v ? delete S.list.f[k] : (S.list.f[k] = v);
      refreshFilterUi();
      return;
    }
    if ((el = c("[data-unf]"))) { e.preventDefault(); delete S.list.f[el.dataset.unf]; refreshFilterUi(); return; }
    if ((el = c("[data-clearf]"))) { S.list.f = {}; refreshFilterUi(); return; }
    if ((el = c("[data-clearq]"))) { e.preventDefault(); S.list.q = ""; refreshFilterUi(); $("#lsearch") && $("#lsearch").focus(); return; }
    if ((el = c("[data-clearall]"))) { S.list.q = ""; S.list.f = {}; const bs = $("#bsearch"); if (bs) bs.value = ""; refreshFilterUi(); return; }
    if ((el = c("[data-sheet-done]"))) { closeSheet(); return; }
    if ((el = c("[data-sheet-cancel]"))) { if (filterSnapshot) { S.list.f = filterSnapshot; refreshFilterUi(); } closeSheet(); return; }
    if ((el = c("[data-open-search]"))) { openSearch(); return; }
    if ((el = c("[data-close-search]"))) { closeSearch(); return; }
    if ((el = c("[data-msug]"))) { const id = el.dataset.msug; closeSearch(); location.hash = "musteriler/" + id; return; }
    if ((el = c("[data-sort]"))) {
      const k = el.dataset.sort, s = S.list.sort;
      S.list.sort = { k, dir: s.k === k ? -s.dir : 1 };
      renderList();
      const b = $(`[data-sort="${k}"]`); b && b.focus();
      return;
    }
    if ((el = c("[data-select]"))) {
      S.list.selecting = !S.list.selecting; S.list.picked.clear();
      $$(".scope-trail [data-select]").forEach((b) => (b.textContent = S.list.selecting ? "Bitti" : "Seç"));
      renderList();
      return;
    }
    if ((el = c("[data-archive]"))) {
      const n = S.list.picked.size;
      if (!n) return;
      S.list.picked.clear(); renderList();
      toast(`${n} müşteri arşivlendi`, { icon: "archive", action: { label: "Geri al", run: () => toast("Arşivleme geri alındı", { icon: "undo-2" }) } });
      return;
    }
    if ((el = c("[data-toggle-insp]"))) { toggleInspector(el); return; }
    if ((el = c("[data-sug]"))) { runSuggest(+el.dataset.sug); return; }
    if ((el = c("[data-back]"))) { leavePush(0); return; }
    if ((el = c("[data-demo]"))) { e.preventDefault(); toast(el.dataset.demo || "Taslakta bu düğme yalnızca görünüm için", { icon: "info" }); return; }
    if ((el = c("[data-appt]"))) { if (c("a")) return; if (pop && pop.anchor === el) { closePopover(); return; } openAppt(el, +el.dataset.appt); return; }

    /* Tablo satırı: seçim (onay kutusu hariç) */
    const tr = c(".tbl tbody tr");
    if (tr && !c("input,button,a")) { selectRow(tr.dataset.id); return; }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-pick]")) {
      t.checked ? S.list.picked.add(t.dataset.pick) : S.list.picked.delete(t.dataset.pick);
      renderBulk();
    }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "lsearch") {
      S.list.q = t.value;
      renderList();
      const lab = $("#toolbar .tb-search");
      if (lab) {
        const has = !!t.value, btn = $(".clear", lab);
        if (has && !btn) { lab.insertAdjacentHTML("beforeend", `<button type="button" class="clear" data-clearq aria-label="Aramayı temizle">${ic("x")}</button>`); icons(); }
        if (!has && btn) btn.remove();
      }
    }
    if (t.id === "gsearch") { sugSel = 0; showSuggest(t); }
    if (t.id === "bsearch") {
      if (S.route === "musteriler") { S.list.q = t.value; renderList(); }
      else drawMobileResults();
    }
  });

  document.addEventListener("keydown", (e) => {
    const t = e.target;
    const typing = t.matches("input, textarea");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
      if (isPhone()) { e.preventDefault(); openSearch(); return; }
      const s = $("#lsearch") || $("#gsearch");
      if (s) { e.preventDefault(); s.focus(); s.select(); }
      return;
    }
    if (e.key === "/" && !typing) {
      if (isPhone()) { e.preventDefault(); openSearch(); return; }
      const s = $("#lsearch") || $("#gsearch");
      if (s) { e.preventDefault(); s.focus(); }
      return;
    }
    if (e.key === "Escape") {
      if (pop) { const a = pop.anchor; closePopover(); a && a.focus && a.focus(); return; }
      if (sheet) { closeSheet(); return; }
      if (side && side.open) { closeSidePanel(); return; }
      if (document.body.classList.contains("is-searching")) { closeSearch(); return; }
      if (sbOverlayOpen()) { closeSbOverlay(); return; }
      if (push) { leavePush(0); return; }
    }
    if ((e.key === "Enter" || e.key === " ") && t.matches && t.matches("[data-appt]")) { e.preventDefault(); openAppt(t, +t.dataset.appt); return; }
    if (t.id === "bsearch" && e.key === "Enter" && S.route !== "musteriler") { const f = $("#mresults [data-msug]"); if (f) f.click(); return; }
    if (t.id === "gsearch" && pop && pop.kind === "suggest") {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sugSel = (sugSel + (e.key === "ArrowDown" ? 1 : -1) + sugItems.length) % sugItems.length; showSuggest(t); return; }
      if (e.key === "Enter") { e.preventDefault(); runSuggest(sugSel); return; }
    }
    const tr = t.closest && t.closest(".tbl tbody tr");
    if (tr && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const sib = e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling;
      if (sib) selectRow(sib.dataset.id);
      return;
    }
    if (tr && e.key === " " && S.list.selecting) {
      e.preventDefault();
      const cb = $("[data-pick]", tr); cb.checked = !cb.checked; cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (tr && e.key === "Enter" && innerWidth < 1280) openSidePanel(musteriBul(tr.dataset.id));
  });

  let lastPhone = isPhone(), rT = 0;
  addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      if (isPhone() !== lastPhone) { lastPhone = isPhone(); closeLayers(); closePush(); lensSp = null; if (S.route) renderRoute(); return; }
      watchSidebar();
      $$(".seg").forEach((s) => s._seg && s._seg.relayout());
      TL && TL.relayout();
      moveLens(S.route, true);
    }, 80);
  });

  /* ---------------- Başlat ---------------- */
  renderShell();
  addEventListener("hashchange", onHash);
  onHash();
  booted = true;
  post({ type: "ready" });
})();
