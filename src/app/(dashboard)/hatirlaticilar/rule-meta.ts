import {
  Banknote,
  Bell,
  CalendarCheck,
  CalendarX2,
  Clock,
  Gift,
  ListTodo,
  Mail,
  MessageCircle,
  MessageSquare,
  PackageX,
  Tag,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { isRuleSupported, isSupportedAction, isSupportedTrigger } from "@/lib/automations/supported";

import type { ActionId, TriggerId } from "./schema";

/** Kural sayfasının sade metinleri ve simgeleri. Kimlikler schema.ts ile birebir aynı. */

export type ParamDef = { label: string; unit?: string; def: string };

export const TRIGGERS: {
  id: TriggerId;
  label: string;
  icon: LucideIcon;
  param?: ParamDef;
}[] = [
  { id: "randevu_oncesi", label: "Randevudan önce", icon: Clock, param: { label: "Kaç saat önce?", unit: "saat", def: "24" } },
  { id: "randevu_tamamlandi", label: "Randevu tamamlandığında", icon: CalendarCheck },
  { id: "noshow", label: "Müşteri randevuya gelmediğinde", icon: CalendarX2 },
  { id: "yeni_lead", label: "Yeni lead eklendiğinde", icon: UserPlus },
  { id: "yeni_musteri", label: "Yeni müşteri eklendiğinde", icon: UserPlus },
  { id: "odeme_alindi", label: "Ödeme alındığında", icon: Banknote },
  { id: "odeme_gecikti", label: "Ödeme geciktiğinde", icon: Wallet, param: { label: "Kaç gün sonra?", unit: "gün", def: "7" } },
  { id: "paket_bitiyor", label: "Paket bitmek üzereyken", icon: PackageX, param: { label: "Kaç seans kaldığında?", unit: "seans", def: "1" } },
  { id: "pasif_musteri", label: "Müşteri uzun süredir gelmediğinde", icon: Clock, param: { label: "Kaç gündür?", unit: "gün", def: "60" } },
  { id: "dogum_gunu", label: "Doğum günü geldiğinde", icon: Gift },
];

export const ACTIONS: {
  id: ActionId;
  label: string;
  icon: LucideIcon;
  message?: boolean;
  param?: ParamDef;
}[] = [
  { id: "wa", label: "WhatsApp mesajı gönder", icon: MessageCircle, message: true },
  { id: "sms", label: "SMS gönder", icon: MessageSquare, message: true },
  { id: "eposta", label: "E-posta gönder", icon: Mail, message: true },
  { id: "indirim", label: "İndirim mesajı gönder", icon: Gift, message: true },
  { id: "hatirlatma", label: "Hatırlatma oluştur", icon: Bell },
  { id: "gorev", label: "Ekibe görev oluştur", icon: ListTodo },
  { id: "etiket_ekle", label: "Müşteriye etiket ekle", icon: Tag, param: { label: "Eklenecek etiket", def: "Takip" } },
];

/** Kural formunda seçilebilenler: yalnızca planlayıcının çalıştırdıkları. */
export const TRIGGER_OPTIONS = TRIGGERS.filter((t) => isSupportedTrigger(t.id));
export const ACTION_OPTIONS = ACTIONS.filter((a) => isSupportedAction(a.id));

export const trigDef = (id: string) => TRIGGERS.find((t) => t.id === id) ?? TRIGGERS[0];
export const actDef = (id: string) => ACTIONS.find((a) => a.id === id) ?? ACTIONS[0];

type Flow = {
  trigger_id: string;
  trigger_param?: number | string | null;
  action_id: string;
  action_param?: string | null;
};

function triggerPhrase(id: string, param?: number | string | null): string {
  const n = param === null || param === undefined || param === "" ? "…" : String(param);
  switch (id) {
    case "randevu_oncesi":
      return `Randevudan ${n} saat önce`;
    case "odeme_gecikti":
      return `Ödeme ${n} gün gecikince`;
    case "paket_bitiyor":
      return `Pakette ${n} seans kaldığında`;
    case "pasif_musteri":
      return `Müşteri ${n} gündür gelmediğinde`;
    default:
      return trigDef(id).label;
  }
}

function actionPhrase(id: string, param?: string | null): string {
  switch (id) {
    case "wa":
      return "müşteriye WhatsApp mesajı gönderilir";
    case "sms":
      return "müşteriye SMS gönderilir";
    case "eposta":
      return "müşteriye e-posta gönderilir";
    case "indirim":
      return "müşteriye indirim mesajı gönderilir";
    case "hatirlatma":
      return "bir hatırlatma oluşturulur";
    case "gorev":
      return "ekibe görev oluşturulur";
    case "etiket_ekle":
      return `müşteriye "${param?.trim() || "…"}" etiketi eklenir`;
    default:
      return actDef(id).label;
  }
}

/** "Randevudan 24 saat önce, müşteriye WhatsApp mesajı gönderilir." */
export function ruleSentence(f: Flow): string {
  return `${triggerPhrase(f.trigger_id, f.trigger_param)}, ${actionPhrase(f.action_id, f.action_param)}.`;
}

/** Hazır şablonlar: en sık kurulan kurallar. */
export type Template = {
  title: string;
  trigger_id: TriggerId;
  trigger_param: number | null;
  action_id: ActionId;
  action_param: string | null;
  message: string | null;
  /** Önerilen Meta şablon adı (WhatsApp aksiyonlarında). */
  wa_template?: string;
};

const ALL_TEMPLATES: Template[] = [
  { title: "Randevu hatırlatma", trigger_id: "randevu_oncesi", trigger_param: 24, action_id: "wa", action_param: null, message: "Merhaba {ad}, yaklaşan randevunuzu hatırlatmak isteriz.", wa_template: "randevu_hatirlatma" },
  { title: "Paket yenileme", trigger_id: "paket_bitiyor", trigger_param: 1, action_id: "wa", action_param: null, message: "Merhaba {ad}, paketinizde son seansınız kaldı. Yenilemek isterseniz size yer ayıralım.", wa_template: "paket_yenileme" },
  { title: "Ödeme hatırlatma", trigger_id: "odeme_gecikti", trigger_param: 7, action_id: "sms", action_param: null, message: "Merhaba {ad}, bekleyen ödemenizi hatırlatmak isteriz." },
  { title: "Doğum günü hediyesi", trigger_id: "dogum_gunu", trigger_param: null, action_id: "indirim", action_param: null, message: "İyi ki doğdunuz {ad}. Size özel bir indirim hediyemiz var.", wa_template: "dogum_gunu" },
  { title: "Geri kazanım", trigger_id: "pasif_musteri", trigger_param: 60, action_id: "sms", action_param: null, message: "Sizi özledik {ad}. Dönüşünüze özel bir fırsatımız var." },
];

export const TEMPLATES: Template[] = ALL_TEMPLATES.filter(isRuleSupported);
