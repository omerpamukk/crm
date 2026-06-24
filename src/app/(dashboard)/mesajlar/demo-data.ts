/**
 * Mesajlaşma (omnichannel gelen kutusu) DEMO verisi.
 *
 * NOT: Instagram/WhatsApp/Messenger/TikTok gerçek veri için Meta/TikTok API
 * entegrasyonu gerektirir. Entegrasyon bağlanana kadar burası demo veriyle
 * doldurulur. Gerçeğe geçince DEMO_MESSAGING = false yapıp bu modülü
 * gerçek sorgularla değiştirmek yeterli.
 */

export const DEMO_MESSAGING = true;

export type Channel = "instagram" | "whatsapp" | "messenger" | "tiktok" | "email";

export interface DemoMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

export interface DemoConversation {
  id: string;
  channel: Channel;
  name: string;
  handle?: string;
  /** Takipçi sayısı / telefon gibi ikincil bilgi. */
  meta?: string;
  preview: string;
  time: string;
  unread: boolean;
  /** Anlık çevrimiçi noktası (WhatsApp vb.). */
  online?: boolean;
  messages: DemoMessage[];
}

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  // --- Instagram ---
  {
    id: "ig-elif",
    channel: "instagram",
    name: "Elif Yıldız",
    handle: "@elif_style",
    meta: "12.4K takipçi",
    preview: "Teşekkürler, ne zaman teslim edilecek?",
    time: "2dk",
    unread: true,
    messages: [
      { id: "1", from: "them", text: "Merhaba! Geçen hafta sipariş vermiştim, kargo durumunu öğrenebilir miyim?", time: "10:32" },
      { id: "2", from: "me", text: "Merhaba Elif Hanım! Siparişiniz bugün kargoya verildi, takip numaranızı şimdi gönderiyorum.", time: "10:35" },
      { id: "3", from: "them", text: "Teşekkürler, ne zaman teslim edilecek?", time: "10:36" },
      { id: "4", from: "me", text: "1-2 iş günü içinde teslim edilecektir. İyi günler! 😊", time: "10:38" },
    ],
  },
  {
    id: "ig-selin",
    channel: "instagram",
    name: "Selin Kaya",
    handle: "@selin.kaya",
    meta: "Instagram",
    preview: "Fiyatlar ne kadar?",
    time: "1sa",
    unread: true,
    messages: [
      { id: "1", from: "them", text: "Merhaba, cilt bakımı fiyatlarınız ne kadar?", time: "12:05" },
    ],
  },
  {
    id: "ig-zeynep",
    channel: "instagram",
    name: "Zeynep A.",
    handle: "@zeynep_ar",
    meta: "Instagram",
    preview: "Randevu alabilir miyim?",
    time: "Dün",
    unread: true,
    messages: [
      { id: "1", from: "them", text: "Randevu alabilir miyim?", time: "18:20" },
    ],
  },
  {
    id: "ig-ahmet",
    channel: "instagram",
    name: "Ahmet C.",
    handle: "@ahmet_c42",
    meta: "Instagram",
    preview: "Bilgileri aldım, teşekkürler",
    time: "Dün",
    unread: false,
    messages: [
      { id: "1", from: "me", text: "Tüm bilgileri ilettim, başka bir sorunuz olursa yazabilirsiniz.", time: "15:10" },
      { id: "2", from: "them", text: "Bilgileri aldım, teşekkürler", time: "15:14" },
    ],
  },

  // --- WhatsApp ---
  {
    id: "wa-murat",
    channel: "whatsapp",
    name: "Murat Demir",
    meta: "0541 xxx xx xx",
    preview: "Evet, Perşembe uygun mu?",
    time: "14dk",
    unread: true,
    online: true,
    messages: [
      { id: "1", from: "them", text: "Merhaba, yarınki randevumu iptal etmek istiyorum.", time: "09:14" },
      { id: "2", from: "me", text: "Merhaba Murat Bey, tabii ki! Yeni bir tarih ister misiniz?", time: "09:15" },
      { id: "3", from: "them", text: "Evet, Perşembe uygun mu?", time: "09:16" },
    ],
  },
  {
    id: "wa-ayse",
    channel: "whatsapp",
    name: "Ayşe Hanım",
    meta: "0532 xxx xx xx",
    preview: "Teklif için teşekkürler",
    time: "45dk",
    unread: true,
    online: true,
    messages: [
      { id: "1", from: "me", text: "Hazırladığım paket teklifini ilettim, dilediğiniz zaman dönebilirsiniz.", time: "08:40" },
      { id: "2", from: "them", text: "Teklif için teşekkürler", time: "08:45" },
    ],
  },
  {
    id: "wa-zeynep",
    channel: "whatsapp",
    name: "Zeynep Arslan",
    meta: "0505 xxx xx xx",
    preview: "Harika hizmet!",
    time: "2sa",
    unread: false,
    messages: [
      { id: "1", from: "them", text: "Bugünkü ilginiz için çok teşekkürler, harika hizmet!", time: "13:02" },
    ],
  },
  {
    id: "wa-kemal",
    channel: "whatsapp",
    name: "Kemal Doğan",
    meta: "0543 xxx xx xx",
    preview: "Fatura bekliyorum",
    time: "Dün",
    unread: false,
    messages: [
      { id: "1", from: "them", text: "Dünkü işlem için faturayı bekliyorum, gönderebilir misiniz?", time: "17:30" },
    ],
  },

  // --- Messenger ---
  {
    id: "ms-hasan",
    channel: "messenger",
    name: "Hasan Polat",
    meta: "Messenger",
    preview: "Danışmanlık hizmetinizden bahseder misiniz?",
    time: "5dk",
    unread: true,
    messages: [
      { id: "1", from: "them", text: "Merhaba! Ürünleriniz hakkında bilgi almak istiyorum, fiyatlar nedir?", time: "10:42" },
      { id: "2", from: "me", text: "Merhaba Hasan Bey! Memnuniyetle yardımcı olabilirim. Hangi ürün veya hizmetimizle ilgileniyorsunuz?", time: "10:44" },
      { id: "3", from: "them", text: "Danışmanlık hizmetinizden bahseder misiniz?", time: "10:45" },
    ],
  },
  {
    id: "ms-leyla",
    channel: "messenger",
    name: "Leyla Aksoy",
    meta: "Messenger",
    preview: "Teşekkürler, görüşürüz!",
    time: "2sa",
    unread: true,
    messages: [
      { id: "1", from: "me", text: "Randevunuzu oluşturdum, bekliyoruz!", time: "11:00" },
      { id: "2", from: "them", text: "Teşekkürler, görüşürüz!", time: "11:03" },
    ],
  },
  {
    id: "ms-faruk",
    channel: "messenger",
    name: "Faruk D.",
    meta: "Messenger",
    preview: "Fiyat listesi var mı?",
    time: "Dün",
    unread: false,
    messages: [
      { id: "1", from: "them", text: "Fiyat listesi var mı?", time: "16:20" },
    ],
  },

  // --- TikTok ---
  {
    id: "tt-merve",
    channel: "tiktok",
    name: "Merve",
    handle: "@mervee.life",
    meta: "24.6K takipçi",
    preview: "Randevu alabilir miyim?",
    time: "4sa",
    unread: true,
    messages: [
      { id: "1", from: "them", text: "Merhaba! Randevu alabilir miyim?", time: "14:30" },
      { id: "2", from: "me", text: "Merhaba! Tabii ki, hangi tarihler size uygun?", time: "14:32" },
    ],
  },
  {
    id: "tt-yasemin",
    channel: "tiktok",
    name: "Yasemin",
    handle: "@yasemin_tt",
    meta: "TikTok",
    preview: "Harika içerik, takipteyim!",
    time: "Dün",
    unread: false,
    messages: [
      { id: "1", from: "them", text: "Harika içerik, takipteyim!", time: "19:45" },
    ],
  },

  // --- E-posta ---
  {
    id: "em-ahmet",
    channel: "email",
    name: "Ahmet Çelik",
    meta: "ahmet.celik@eposta.com",
    preview: "Fatura bekliyorum",
    time: "3sa",
    unread: false,
    messages: [
      { id: "1", from: "them", text: "Merhaba, geçen haftaki işlemin faturasını bekliyorum. İyi çalışmalar.", time: "09:50" },
    ],
  },
];

/** Belirli kanaldaki (yoksa tümü) okunmamış sohbet sayısı. */
export function unreadCount(channel?: Channel): number {
  return DEMO_CONVERSATIONS.filter(
    (c) => c.unread && (!channel || c.channel === channel)
  ).length;
}

/** Sidebar rozeti için toplam okunmamış. */
export const DEMO_UNREAD_TOTAL = unreadCount();
