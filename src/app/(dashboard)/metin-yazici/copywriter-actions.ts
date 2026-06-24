"use server";

/**
 * AI Metin Yazıcı.
 * ANTHROPIC_API_KEY tanımlıysa gerçek Claude çağrısı yapar; tanımlı değilse
 * (demo ortamı) salon temalı şablon yanıt üretir. Böylece anahtar eklenince
 * tek değişiklikle gerçek üretime geçer.
 */

const SYSTEM_PROMPT =
  "Sen bir güzellik merkezi (Defne Beauty Center) için Türkçe pazarlama metni yazarısın. " +
  "İstenen platforma uygun, akıcı, ikna edici ve marka diline uygun metinler üret. " +
  "Gerektiğinde emoji ve hashtag kullan. Kısa ve net ol.";

function demoResponse(prompt: string): string {
  const p = prompt.toLocaleLowerCase("tr");
  if (p.includes("instagram") || p.includes("caption")) {
    return "✨ Bu yaz cildin ışıldasın! ✨\n\nDefne Beauty Center'da uzman ellerde yenilen. Cilt bakımı, kalıcı makyaj ve daha fazlası seni bekliyor 💆‍♀️\n\nHemen randevu al, kendine iyi bak! 🌸\n\n#güzellik #ciltbakımı #defnebeauty #bakımzamanı #güzellikmerkezi";
  }
  if (p.includes("whatsapp")) {
    return "Merhaba 🌸 Defne Beauty Center'dan sevgilerle!\n\nBu haftaya özel cilt bakımı paketlerimizde %20 indirim fırsatını kaçırma. Randevu için bu mesaja yanıt vermen yeterli 💆‍♀️\n\nKendine iyi bakmanın tam zamanı!";
  }
  if (p.includes("sms")) {
    return "Defne Beauty: Hafta sonuna özel cilt bakımında %20 indirim! Randevu: 0XXX XXX XX XX. Çıkış için STOP yazın.";
  }
  if (p.includes("e-posta") || p.includes("bülten") || p.includes("mail")) {
    return "Konu: Bu Ay Sana Özel Güzellik Fırsatları ✨\n\nMerhaba,\n\nDefne Beauty Center olarak bu ay seni şımartmak istiyoruz. Cilt bakımı, kalıcı makyaj ve lazer epilasyon hizmetlerimizde sana özel avantajlar hazırladık.\n\nRandevunu hemen oluştur, güzelliğine güzellik kat.\n\nSevgiler,\nDefne Beauty Center";
  }
  if (p.includes("hashtag")) {
    return "#güzellik #güzellikmerkezi #ciltbakımı #kalıcımakyaj #lazerepilasyon #bakımzamanı #defnebeauty #kendineiyibak #güzelliksırrı #cilt";
  }
  if (p.includes("blog")) {
    return "Başlık: Yaz Aylarında Cilt Bakımının 5 Altın Kuralı\n\nYazın sıcak günlerinde cildini korumak için bilmen gereken her şeyi uzmanlarımız derledi. Güneş koruyucudan nemlendirmeye, doğru rutinden profesyonel bakıma...";
  }
  return "İşte hazırladığım metin:\n\n✨ Defne Beauty Center ile güzelliğin yeni adresi! Uzman kadromuz ve özel bakım hizmetlerimizle seni en iyi şekilde ağırlamaya hazırız. Randevu al, farkı hisset! 🌸\n\n(Demo yanıt — ANTHROPIC_API_KEY eklendiğinde gerçek AI üretimi devreye girer.)";
}

export async function generateCopy(
  prompt: string
): Promise<{ text: string; demo: boolean; error?: string }> {
  const clean = prompt.trim();
  if (!clean) return { text: "", demo: true, error: "Lütfen ne yazmamı istediğini belirt." };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { text: demoResponse(clean), demo: true };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: clean }],
      }),
    });
    if (!res.ok) return { text: demoResponse(clean), demo: true };
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data?.content?.[0]?.text?.trim();
    return text ? { text, demo: false } : { text: demoResponse(clean), demo: true };
  } catch {
    return { text: demoResponse(clean), demo: true };
  }
}
