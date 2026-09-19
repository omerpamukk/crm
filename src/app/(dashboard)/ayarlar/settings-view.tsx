"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  Bell,
  Plug,
  CreditCard,
  History,
  Save,
  Upload,
  Store,
  RefreshCw,
  MapPin,
  CalendarPlus,
  Sun,
  Moon,
  Copy,
  Crown,
  FileSpreadsheet,
  Code2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InstagramLogo, WhatsappLogo, TiktokLogo, EmailLogo } from "../mesajlar/channel-icons";
import { SECTORS } from "@/lib/constants";
import { formatPrice, formatDate } from "@/lib/format";
import type { Subscription } from "@/types/database";

import {
  updateBusinessInfo,
  updateOwnerProfile,
  updateWorkingHours,
  updateNotificationSettings,
  saveIntegration,
  disconnectIntegration,
  testIntegration,
} from "./actions";
import type { WorkingDay, NotificationSettingInput, NotifKey, Provider } from "./schema";

/** Bildirim anahtarlarının okunur karşılığı. */
const NOTIF_LABEL: Record<NotifKey, { title: string; desc: string }> = {
  yeni_lead: { title: "Yeni lead geldiğinde bildir", desc: "Online randevu veya form üzerinden yeni kayıt düştüğünde." },
  gecikmis_odeme: { title: "Gecikmiş ödeme uyarısı", desc: "Paket borcu vadesini geçen müşteriler için." },
  randevu_hatirlatma: { title: "Randevu hatırlatması", desc: "Yaklaşan randevular için müşteriye ve personele." },
  gorev_deadline: { title: "Görev tarihi yaklaşınca", desc: "Termin tarihine 1 gün kalan görevler." },
  yeni_yorum: { title: "Yeni yorum geldiğinde", desc: "Google İşletme Profili bağlandığında etkinleşir." },
  kritik_stok: { title: "Kritik stok uyarısı", desc: "Ürün miktarı kritik seviyenin altına düştüğünde." },
  sabah_ozeti: { title: "Sabah Özeti", desc: "Günlük randevular, leadler, görevler ve tahsilatlar." },
  gun_sonu_ozeti: { title: "Gün Sonu Özeti", desc: "Günlük satış, seans, mesaj ve tamamlanan görevler." },
};

/** Özet bildirimleri ayrı kartta gösterilir (saat seçimi var). */
const DIGEST_KEYS: NotifKey[] = ["sabah_ozeti", "gun_sonu_ozeti"];

const CHANNEL_LABEL: Record<string, string> = {
  panel: "Panel",
  sms: "SMS",
  email: "E-posta",
  whatsapp: "WhatsApp",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Yönetici",
  reception: "Resepsiyon",
  specialist: "Uzman",
};

/** Denetim kaydı etiketleri (0017_business_audit.sql). */
const ACTION_LABEL: Record<string, string> = {
  ekle: "ekledi",
  guncelle: "güncelledi",
  sil: "sildi",
};
const ENTITY_LABEL: Record<string, string> = {
  musteri: "müşteri",
  odeme: "ödeme",
  gider: "gider",
  paket: "paket",
  randevu: "randevu",
  personel: "personel",
  ayarlar: "ayarları",
};
const ACTION_TONE: Record<string, string> = {
  ekle: "bg-positive",
  guncelle: "bg-primary",
  sil: "bg-danger",
};

function exportAuditCsv(rows: SettingsData["auditLog"]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["Tarih", "Kullanıcı", "İşlem", "Kayıt", "Özet"].join(";");
  const body = rows
    .map((r) =>
      [
        new Date(r.created_at).toLocaleString("tr-TR"),
        r.actor_label,
        ACTION_LABEL[r.action] ?? r.action,
        ENTITY_LABEL[r.entity] ?? r.entity,
        r.summary ?? "",
      ]
        .map(esc)
        .join(";")
    )
    .join("\n");
  const blob = new Blob([`\ufeff${head}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `islem-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  defaultValue,
  placeholder,
  disabled,
  type,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  const id = `f-${label.replace(/\s+/g, "-").toLocaleLowerCase("tr")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{hint && <span className="ml-1 normal-case text-muted-foreground/70">({hint})</span>}
      </label>
      <input
        id={id}
        type={type}
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : { defaultValue })}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:bg-muted/40 disabled:text-muted-foreground"
      />
    </div>
  );
}

export interface SettingsData {
  business: { name: string; sector: string; phone: string; email: string; address: string };
  owner: { full_name: string; phone: string; email: string; roleLabel: string };
  workingDays: WorkingDay[];
  subscription: Pick<Subscription, "plan" | "status" | "price" | "started_at" | "expires_at"> | null;
  auditLog: { id: string; created_at: string; actor_label: string; action: string; entity: string; summary: string | null }[];
  notifications: NotificationSettingInput[];
  /** credentials burada YOK — sunucuda kalır, asla client'a gelmez. */
  integrations: {
    provider: Provider;
    status: "connected" | "disconnected" | "error";
    account_label: string | null;
    last_error: string | null;
    connected_at: string | null;
  }[];
}

export function SettingsView({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [biz, setBiz] = useState(data.business);
  const [owner, setOwner] = useState({ full_name: data.owner.full_name, phone: data.owner.phone });

  function saveBusiness() {
    start(async () => {
      const res = await updateBusinessInfo(biz);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Firma bilgileri kaydedildi.");
        router.refresh();
      }
    });
  }

  function saveOwner() {
    start(async () => {
      const res = await updateOwnerProfile(owner);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Profil kaydedildi.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="İşletme bilgilerini, çalışma saatlerini, bildirimleri ve entegrasyonları yönet." />

      <Tabs defaultValue="temel">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="temel"><Building2 className="size-4" />Temel Bilgiler</TabsTrigger>
            <TabsTrigger value="saat"><Clock className="size-4" />Çalışma Saatleri</TabsTrigger>
            <TabsTrigger value="bildirim"><Bell className="size-4" />Bildirimler</TabsTrigger>
            <TabsTrigger value="entegrasyon"><Plug className="size-4" />Entegrasyonlar</TabsTrigger>
            <TabsTrigger value="abonelik"><CreditCard className="size-4" />Abonelik</TabsTrigger>
            <TabsTrigger value="log"><History className="size-4" />Sistem Logları</TabsTrigger>
          </TabsList>
        </div>

        {/* Temel Bilgiler */}
        <TabsContent value="temel" className="mt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-primary" />Firma Bilgileri</CardTitle>
                <Button size="sm" disabled={pending} onClick={saveBusiness}><Save className="size-4" />{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Firma Adı" value={biz.name} onChange={(v) => setBiz((p) => ({ ...p, name: v }))} />
                <div className="space-y-1.5">
                  <label htmlFor="f-sektor" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektör</label>
                  <select id="f-sektor" value={biz.sector} onChange={(e) => setBiz((p) => ({ ...p, sector: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Seçiniz…</option>
                    {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Firma Telefonu" value={biz.phone} onChange={(v) => setBiz((p) => ({ ...p, phone: v }))} placeholder="+90 5xx xxx xx xx" />
                  <Field label="E-posta" type="email" value={biz.email} onChange={(v) => setBiz((p) => ({ ...p, email: v }))} placeholder="info@ornek.com" />
                </div>
                <Field label="Adres" value={biz.address} onChange={(v) => setBiz((p) => ({ ...p, address: v }))} />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo</label>
                  <div className="flex items-center gap-3">
                    <span className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary"><Store className="size-6" /></span>
                    <Button variant="outline" onClick={() => toast.info("Logo yükleme (demo).")}><Upload className="size-4" />Logo Yükle</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">İşletme Sahibi</CardTitle>
                <Button size="sm" variant="outline" disabled={pending} onClick={saveOwner}><Save className="size-4" />{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Ad Soyad" value={owner.full_name} onChange={(v) => setOwner((p) => ({ ...p, full_name: v }))} />
                <Field label="Telefon" hint="opsiyonel" value={owner.phone} onChange={(v) => setOwner((p) => ({ ...p, phone: v }))} placeholder="+90 5xx xxx xx xx" />
                <Field label="E-posta" defaultValue={data.owner.email} disabled />
                <Field label="Rol" defaultValue={data.owner.roleLabel} disabled />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Çalışma Saatleri */}
        <TabsContent value="saat" className="mt-4">
          <WorkingHours initial={data.workingDays} />
        </TabsContent>

        {/* Bildirimler */}
        <TabsContent value="bildirim" className="mt-4 space-y-4">
          <Notifications initial={data.notifications} />
        </TabsContent>

        {/* Entegrasyonlar */}
        <TabsContent value="entegrasyon" className="mt-4 space-y-4">
          <Integrations rows={data.integrations} />
        </TabsContent>

        {/* Abonelik */}
        <TabsContent value="abonelik" className="mt-4">
          <SubscriptionTab sub={data.subscription} />
        </TabsContent>

        {/* Sistem Logları */}
        <TabsContent value="log" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">İşlem kayıtları</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Son 50 kayıt · yalnızca yöneticiler görebilir
                </p>
              </div>
              {data.auditLog.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => exportAuditCsv(data.auditLog)}>
                  <FileSpreadsheet className="size-4" />
                  CSV indir
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {data.auditLog.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Henüz kayıt yok. Silme ve ödeme işlemleri buraya düşecek.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.auditLog.map((l) => (
                    <li key={l.id} className="flex items-start gap-3 py-3 text-sm">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("tr-TR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ACTION_TONE[l.action] ?? "bg-muted-foreground")} />
                      <span className="flex-1">
                        <b>{l.actor_label}</b>{" "}
                        {ENTITY_LABEL[l.entity] ?? l.entity}{" "}
                        {ACTION_LABEL[l.action] ?? l.action}
                        {l.summary && <> — <span className="text-muted-foreground">{l.summary}</span></>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const DAY_LABEL = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function WorkingHours({ initial }: { initial: WorkingDay[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [days, setDays] = useState<WorkingDay[]>(initial);
  const [sync, setSync] = useState({ maps: true, booking: true });

  function patch(i: number, next: Partial<WorkingDay>) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...next } : d)));
  }

  function save() {
    start(async () => {
      const res = await updateWorkingHours({ days });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Çalışma saatleri kaydedildi.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" />Haftalık Çalışma Düzeni</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Bu bilgiler randevu linkine otomatik yansır.</p>
          </div>
          <Button size="sm" disabled={pending} onClick={save}><Save className="size-4" />{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map((d, i) => (
            <div key={d.day} className="flex items-center gap-3">
              <span className="w-10 text-sm font-medium">{DAY_LABEL[d.day]}</span>
              <Switch on={d.open} onClick={() => patch(i, { open: !d.open })} />
              {d.open ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${DAY_LABEL[d.day]} açılış`}
                    value={d.start}
                    onChange={(e) => patch(i, { start: e.target.value })}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABEL[d.day]} kapanış`}
                    value={d.end}
                    onChange={(e) => patch(i, { end: e.target.value })}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm font-medium text-danger">Kapalı</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="size-4 text-primary" />Otomatik Senkronizasyon</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Aktif plana göre saatler seçilen platformlara otomatik yansır.</p>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-positive/10 text-positive"><MapPin className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Google Maps çalışma saatlerini güncelle</p>
              <p className="text-xs text-muted-foreground">Aktif plana göre Google İşletme Profili saatleri otomatik senkronize olur</p>
            </div>
            <Switch on={sync.maps} onClick={() => setSync((s) => ({ ...s, maps: !s.maps }))} />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarPlus className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Randevu linki saatlerini güncelle</p>
              <p className="text-xs text-muted-foreground">Aktif plana göre online randevu sayfasının müsait slotları otomatik güncellenir</p>
            </div>
            <Switch on={sync.booking} onClick={() => setSync((s) => ({ ...s, booking: !s.booking }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Notifications({ initial }: { initial: NotificationSettingInput[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState(initial);
  const [dirty, setDirty] = useState(false);

  function patch(key: NotifKey, next: Partial<NotificationSettingInput>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...next } : i)));
    setDirty(true);
  }

  function toggleChannel(key: NotifKey, ch: string) {
    const item = items.find((i) => i.key === key);
    if (!item) return;
    const has = item.channels.includes(ch as never);
    patch(key, {
      channels: (has
        ? item.channels.filter((c) => c !== ch)
        : [...item.channels, ch]) as NotificationSettingInput["channels"],
    });
  }

  function toggleRole(key: NotifKey, role: string) {
    const item = items.find((i) => i.key === key);
    if (!item) return;
    const has = item.recipient_roles.includes(role as never);
    patch(key, {
      recipient_roles: (has
        ? item.recipient_roles.filter((r) => r !== role)
        : [...item.recipient_roles, role]) as NotificationSettingInput["recipient_roles"],
    });
  }

  function save() {
    start(async () => {
      const res = await updateNotificationSettings({ items });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Bildirim tercihleri kaydedildi.");
        setDirty(false);
        router.refresh();
      }
    });
  }

  const events = items.filter((i) => !DIGEST_KEYS.includes(i.key));
  const digests = items.filter((i) => DIGEST_KEYS.includes(i.key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Panel bildirimleri hemen çalışır. SMS, e-posta ve WhatsApp için
          ilgili bağlantının <b>Entegrasyonlar</b> sekmesinde kurulu olması gerekir.
        </p>
        <Button size="sm" disabled={pending || !dirty} onClick={save}>
          <Save className="size-4" />
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-primary" />
              Olay Bildirimleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {events.map((n) => (
              <div key={n.key} className="border-b py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{NOTIF_LABEL[n.key].title}</p>
                    <p className="text-xs text-muted-foreground">{NOTIF_LABEL[n.key].desc}</p>
                  </div>
                  <Switch on={n.enabled} onClick={() => patch(n.key, { enabled: !n.enabled })} />
                </div>
                {n.enabled && (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    {(["panel", "sms", "email", "whatsapp"] as const).map((ch) => (
                      <label key={ch} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-primary"
                          checked={n.channels.includes(ch)}
                          onChange={() => toggleChannel(n.key, ch)}
                        />
                        {CHANNEL_LABEL[ch]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="size-4 text-primary" />
              Özet Mesajları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {digests.map((d) => {
              const Icon = d.key === "sabah_ozeti" ? Sun : Moon;
              return (
                <div key={d.key} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-semibold">
                      <Icon className={cn("size-4", d.key === "sabah_ozeti" ? "text-amber-500" : "text-violet-500")} />
                      {NOTIF_LABEL[d.key].title}
                    </p>
                    <Switch on={d.enabled} onClick={() => patch(d.key, { enabled: !d.enabled })} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{NOTIF_LABEL[d.key].desc}</p>

                  {d.enabled && (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <label htmlFor={`t-${d.key}`} className="text-xs font-medium text-muted-foreground">
                          Gönderim saati
                        </label>
                        <input
                          id={`t-${d.key}`}
                          type="time"
                          value={d.send_at ?? "09:00"}
                          onChange={(e) => patch(d.key, { send_at: e.target.value })}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Gönderilecekler:</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {(["owner", "reception", "specialist"] as const).map((r) => (
                            <label key={r} className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                checked={d.recipient_roles.includes(r)}
                                onChange={() => toggleRole(d.key, r)}
                              />
                              {ROLE_LABEL[r]}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Kanal:</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {(["panel", "sms", "email", "whatsapp"] as const).map((ch) => (
                            <label key={ch} className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                checked={d.channels.includes(ch)}
                                onChange={() => toggleChannel(d.key, ch)}
                              />
                              {CHANNEL_LABEL[ch]}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Bağlanabilir sağlayıcılar ve istedikleri kimlik alanları. */
const CONNECTABLE: {
  provider: Provider;
  name: string;
  hint: string;
  logo: typeof InstagramLogo;
  fields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
}[] = [
  {
    provider: "sms",
    name: "SMS (Netgsm)",
    hint: "Randevu hatırlatma ve toplu SMS için",
    logo: EmailLogo,
    fields: [
      { key: "usercode", label: "Kullanıcı kodu", placeholder: "850XXXXXXX" },
      { key: "password", label: "Şifre", secret: true },
      { key: "msgheader", label: "Mesaj başlığı", placeholder: "FIRMAADI" },
    ],
  },
  {
    provider: "smtp",
    name: "E-posta (Resend)",
    hint: "Bilgilendirme ve bülten e-postaları için",
    logo: EmailLogo,
    fields: [
      { key: "api_key", label: "API anahtarı", placeholder: "re_...", secret: true },
      { key: "from", label: "Gönderen adresi", placeholder: "randevu@ornek.com" },
    ],
  },
  {
    provider: "whatsapp",
    name: "WhatsApp Business API",
    hint: "Meta Cloud API üzerinden mesaj gönderimi",
    logo: WhatsappLogo,
    fields: [
      { key: "phone_number_id", label: "Telefon numarası kimliği", placeholder: "1234567890" },
      { key: "access_token", label: "Erişim jetonu", secret: true },
    ],
  },
];

/** Hesap onayı bekleyen, henüz bağlanamayan sağlayıcılar. */
const PENDING_APPROVAL: { name: string; hint: string; logo: typeof InstagramLogo }[] = [
  { name: "Instagram Business", hint: "Meta uygulama incelemesi gerekiyor", logo: InstagramLogo },
  { name: "TikTok Business", hint: "İş hesabı onayı gerekiyor", logo: TiktokLogo },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  connected: { label: "Bağlı", cls: "bg-positive/12 text-positive" },
  error: { label: "Hata", cls: "bg-danger/12 text-danger" },
  disconnected: { label: "Bağlı değil", cls: "bg-muted text-muted-foreground" },
};

function Integrations({ rows }: { rows: SettingsData["integrations"] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  /** Hangi sağlayıcının formu açık. */
  const [editing, setEditing] = useState<Provider | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [testTo, setTestTo] = useState<Record<string, string>>({});

  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  function openForm(p: Provider) {
    setEditing(p);
    setCreds({});
    setLabel(byProvider.get(p)?.account_label ?? "");
  }

  function save(p: Provider) {
    start(async () => {
      const res = await saveIntegration({ provider: p, account_label: label, credentials: creds });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Bağlantı kaydedildi.");
        setEditing(null);
        setCreds({});
        router.refresh();
      }
    });
  }

  function disconnect(p: Provider, name: string) {
    if (!window.confirm(`${name} bağlantısı kaldırılsın mı? Kayıtlı bilgiler silinir.`)) return;
    start(async () => {
      const res = await disconnectIntegration(p);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Bağlantı kaldırıldı.");
        router.refresh();
      }
    });
  }

  function test(p: Provider) {
    const to = testTo[p] ?? "";
    start(async () => {
      const res = await testIntegration(p, to);
      if (res.error) toast.error(res.error);
      else toast.success("Test mesajı gönderildi.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="size-4 text-primary" />
            Mesajlaşma Sağlayıcıları
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bilgiler şifreli olarak sunucuda saklanır, bu ekrana geri getirilmez.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {CONNECTABLE.map((it) => {
            const Logo = it.logo;
            const row = byProvider.get(it.provider);
            const status = STATUS_BADGE[row?.status ?? "disconnected"];
            const open = editing === it.provider;

            return (
              <div key={it.provider} className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border bg-card", !row && "opacity-50")}>
                    <Logo className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row?.account_label || it.hint}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-medium", status.cls)}>
                    {status.label}
                  </span>
                </div>

                {row?.last_error && (
                  <p className="mt-2 rounded-lg bg-danger/8 px-2.5 py-1.5 text-xs text-danger" role="alert">
                    Son hata: {row.last_error}
                  </p>
                )}

                {open ? (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <Field
                      label="Görünen ad"
                      hint="opsiyonel"
                      value={label}
                      onChange={setLabel}
                      placeholder={it.name}
                    />
                    {it.fields.map((f) => (
                      <Field
                        key={f.key}
                        label={f.label}
                        type={f.secret ? "password" : undefined}
                        value={creds[f.key] ?? ""}
                        onChange={(v) => setCreds((p) => ({ ...p, [f.key]: v }))}
                        placeholder={f.placeholder}
                      />
                    ))}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={pending} onClick={() => save(it.provider)}>
                        <Save className="size-4" />
                        {pending ? "Kaydediliyor…" : "Kaydet"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(null)}>
                        Vazgeç
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openForm(it.provider)}>
                      <Plug className="size-4" />
                      {row ? "Bilgileri güncelle" : "Bağla"}
                    </Button>
                    {row && (
                      <>
                        <input
                          aria-label={`${it.name} test alıcısı`}
                          value={testTo[it.provider] ?? ""}
                          onChange={(e) => setTestTo((p) => ({ ...p, [it.provider]: e.target.value }))}
                          placeholder={it.provider === "smtp" ? "test@ornek.com" : "05xx xxx xx xx"}
                          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm"
                        />
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => test(it.provider)}>
                          Test gönder
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          className="text-danger hover:text-danger"
                          onClick={() => disconnect(it.provider, it.name)}
                        >
                          Kaldır
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="size-4 text-primary" />
            Onay Bekleyenler
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bu servisler Meta / TikTok tarafında işletme hesabı onayı gerektiriyor.
            Onay tamamlandığında buradan bağlanabilecek.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {PENDING_APPROVAL.map((it) => {
            const Logo = it.logo;
            return (
              <div key={it.name} className="flex items-center gap-3 rounded-lg border p-3 opacity-70">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border bg-card">
                  <Logo className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.hint}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  Onay bekliyor
                </span>
              </div>
            );
          })}

          <div className="flex items-center gap-3 rounded-lg border p-3 opacity-70">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-positive/10 text-positive">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Google İşletme Profili</p>
              <p className="text-xs text-muted-foreground">Yorum çekme ve saat senkronu için</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              Onay bekliyor
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const PLAN_LABEL: Record<string, string> = { trial: "Deneme", temel: "Temel Paket", pro: "Pro Paket" };
const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "text-positive" },
  trial: { label: "Deneme", cls: "text-primary" },
  suspended: { label: "Askıda", cls: "text-amber-600" },
  cancelled: { label: "İptal", cls: "text-danger" },
};

function SubscriptionTab({ sub }: { sub: SettingsData["subscription"] }) {
  // Render sırasında Date.now() saf değil; ilk render'da bir kez sabitlenir.
  const [nowMs] = useState(() => Date.now());
  const expires = sub?.expires_at ? new Date(sub.expires_at) : null;
  const left = expires ? Math.ceil((expires.getTime() - nowMs) / 86_400_000) : null;
  const status = SUB_STATUS[sub?.status ?? "active"] ?? SUB_STATUS.active;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Crown className="size-4 text-primary" />Mevcut Paket</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-primary">{PLAN_LABEL[sub?.plan ?? "trial"] ?? sub?.plan ?? "—"}</p>
              <span className={cn("text-sm font-medium", status.cls)}>· {status.label}</span>
            </div>
            {sub?.price ? (
              <p className="text-sm text-muted-foreground">{formatPrice(sub.price)} / dönem</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ücretsiz</p>
            )}
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Abonelik Bitiş</p>
                <p className="font-semibold">{expires ? formatDate(sub!.expires_at!) : "Süresiz"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Kalan Süre</p>
                <p className={cn("font-semibold", left !== null && left < 15 ? "text-danger" : "text-positive")}>
                  {left !== null ? `${Math.max(left, 0)} gün` : "—"}
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Paket değişikliği için yöneticinle iletişime geç.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Abonelik Geçmişi</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Başlangıç</span>
            <span className="font-medium">{sub?.started_at ? formatDate(sub.started_at) : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Durum</span>
            <span className={cn("font-medium", status.cls)}>{status.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Dönem Ücreti</span>
            <span className="font-medium">{sub?.price ? formatPrice(sub.price) : "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
