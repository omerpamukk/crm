---
name: feedback-skill-tam-uygula
description: Kullanıcı bir skill'le (ör. apple-design) tasarım istediğinde CLAUDE.md'deki stil yasaklarıyla (cam, gradient, renkli ikon kutusu) frenleme; skill ne diyorsa tam uygula
metadata:
  type: feedback
---

Kullanıcı bir tasarım skill'iyle (ör. `apple-design`) "nasıl bir tasarım çıkar" görmek istediğinde, CLAUDE.md "Tasarım dili" yasakları (glassmorphism, gradient, renkli ikon kutusu, kart içinde kart, sabit hex) o taslak için geçerli değildir. Skill neyi gerektiriyorsa tam haliyle uygula.

**Why:** 2026-11-05'te D yönünü yasaklara uyarak yaptım (cam yalnızca mobil sekme çubuğunda). Kullanıcı: "ben bir sınır istemedim, isteğim sadece skill'i kullanarak nasıl bir tasarım elde edeceğimizi görmekti; kullanılması gerekiyorsa kullansalardı." Bu yasaklar Eylül'de ekibin seçtiği "Sakin & Profesyonel" stilden kalma, kullanıcının isteği değil.

**How to apply:**
- Stil kuralı ile kullanıcının kendi ilkesini ayır. Hâlâ bağlayıcı olanlar: metin kırılmaz (375px), kafa karışıklığı yok (tek birincil düğme, menü adı = başlık, çıkmaz yok). Bunlarla skill çatışırsa skill'i uygula, raporda belirt.
- "Yasak gevşetildi" demek her şeyi kullanmak değildir: skill'in kendi ölçütü geçerli (ör. Liquid Glass yalnızca işlev katmanında, renk tek anlam).
- İlgili: [[feedback-gorsel-yon]], [[feedback-mobil-tek-satir]]
