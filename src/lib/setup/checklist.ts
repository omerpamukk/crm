/**
 * İlk kurulum adımları (Genel Bakış'taki "Kurulum" kartı). Saf: durum
 * dışarıdan gelir. Her adım, ilgili özellik çalışsın diye gerekli olan
 * en küçük ayardır; tamamlanmamış adım hangi sayfada yapılacağını söyler.
 */

export type SetupState = {
  hasHours: boolean;
  services: number;
  staff: number;
  customers: number;
  smsConnected: boolean;
  /** Online randevu modülü açık mı (kapalıysa adım listelenmez). */
  bookingModule: boolean;
  bookingActive: boolean;
};

export type SetupStep = { key: string; title: string; hint: string; href: string; done: boolean };

export function setupSteps(s: SetupState): SetupStep[] {
  const steps: SetupStep[] = [
    { key: "saatler", title: "Çalışma saatleri", hint: "Takvim, doluluk ve online randevu buna göre çalışır.", href: "/ayarlar?bolum=saatler", done: s.hasHours },
    { key: "hizmetler", title: "Hizmetler", hint: "Fiyat ve süreleriyle sunduğunuz hizmetler.", href: "/hizmetler", done: s.services > 0 },
    { key: "personel", title: "Personel", hint: "Randevuları kimin vereceğini ekleyin.", href: "/personel", done: s.staff > 0 },
    { key: "musteriler", title: "Müşteriler", hint: "Tek tek ekleyin ya da Excel'den toplu yükleyin.", href: "/musteriler", done: s.customers > 0 },
    { key: "sms", title: "SMS bağlantısı", hint: "Hatırlatma ve kampanyalar için Netgsm hesabınız.", href: "/ayarlar?bolum=baglantilar", done: s.smsConnected },
  ];
  if (s.bookingModule) {
    steps.push({ key: "randevu", title: "Randevu linki", hint: "Müşteriler boş saatleri görüp kendileri randevu alır.", href: "/randevu-linki", done: s.bookingActive });
  }
  return steps;
}
