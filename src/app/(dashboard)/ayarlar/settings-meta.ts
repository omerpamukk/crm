import type { NotifKey } from "./schema";

/** Bildirim anahtarlarının okunur karşılığı. */
export const NOTIF_LABEL: Record<NotifKey, { title: string; desc: string }> = {
  yeni_lead: { title: "Yeni lead", desc: "Online randevu ya da form üzerinden yeni kayıt düştüğünde." },
  gecikmis_odeme: { title: "Gecikmiş ödeme", desc: "Ödemesi gecikmiş müşteriler için." },
  randevu_hatirlatma: { title: "Randevu hatırlatması", desc: "Yaklaşan randevular için müşteriye ve personele." },
  gorev_deadline: { title: "Görev tarihi", desc: "Son tarihine 1 gün kalan görevler için." },
  yeni_yorum: { title: "Yeni yorum", desc: "Müşteri yorumu geldiğinde." },
  kritik_stok: { title: "Kritik stok", desc: "Ürün miktarı kritik seviyenin altına düştüğünde." },
  sabah_ozeti: { title: "Sabah özeti", desc: "Günün randevuları, lead'leri, görevleri ve tahsilatları." },
  gun_sonu_ozeti: { title: "Gün sonu özeti", desc: "Günün satışı, randevuları ve tamamlanan görevleri." },
};

/** Özet bildirimleri ayrı grupta gösterilir (gönderim saati var). */
export const DIGEST_KEYS: NotifKey[] = ["sabah_ozeti", "gun_sonu_ozeti"];

/** Çalışmayan bildirimler arayüzde gösterilmez (Google bağlantısı henüz yok). */
export const HIDDEN_NOTIF_KEYS: NotifKey[] = ["yeni_yorum"];

export const CHANNELS = [
  { key: "panel", label: "Panel" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "E-posta" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

export const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(
  CHANNELS.map((c) => [c.key, c.label])
);

/** Bildirimin ulaşacağı roller (arayüz adlarıyla). */
export const RECIPIENT_ROLES = [
  { key: "owner", label: "Yönetici" },
  { key: "reception", label: "Resepsiyon" },
  { key: "specialist", label: "Uzman" },
] as const;

/** Haftanın günleri: 1 = Pazartesi … 7 = Pazar. */
export const DAY_NAME = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
