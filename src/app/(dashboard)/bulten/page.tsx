"use client";

import { useState } from "react";
import {
  Users,
  MailOpen,
  MousePointerClick,
  Send,
  Mail,
  Plus,
  Download,
  CheckCircle2,
  Pencil,
  Zap,
  Trash2,
  Info,
  FileText,
  History,
  ShieldCheck,
  Globe,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KPIS = [
  { label: "Abone", value: "1.284", icon: Users, tone: "bg-primary/10 text-primary", bar: "border-l-primary", sub: "+38 bu ay" },
  { label: "Açılma Oranı", value: "%42", icon: MailOpen, tone: "bg-positive/10 text-positive", bar: "border-l-positive", sub: "Sektör ort. %21" },
  { label: "Tıklanma Oranı", value: "%8.3", icon: MousePointerClick, tone: "bg-warning/12 text-amber-600", bar: "border-l-warning", sub: "+1.2%" },
  { label: "Gönderilen (Bu Ay)", value: "3", icon: Send, tone: "bg-sky-100 text-sky-600", bar: "border-l-sky-400", sub: "Bülten" },
];

const NEWSLETTERS = [
  { id: "n1", title: "Mayıs Kampanyası", meta: "Gönderildi — 15 May 2026 · 1.140 alıcı · %44 açılma", status: "sent" as const },
  { id: "n2", title: "Yeni Hizmet Duyurusu", meta: "Gönderildi — 28 Nis 2026 · 1.102 alıcı · %39 açılma", status: "sent" as const },
  { id: "n3", title: "Haziran Bülteni", meta: "Son düzenleme: bugün", status: "draft" as const },
];

const SOURCES = [
  { label: "Web Sitesi Formu", value: 642, icon: Globe },
  { label: "CRM Müşterileri", value: 498, icon: Users },
  { label: "Sosyal Medya", value: 144, icon: Smartphone },
];

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export default function BultenPage() {
  const [rules, setRules] = useState([
    { id: "r1", tag: "🏆 VIP Müşteri", series: "VIP Hoş Geldiniz Serisi", on: true },
    { id: "r2", tag: "📣 Kampanya Hedef", series: "Mayıs Kampanyası", on: false },
  ]);
  const [gdpr, setGdpr] = useState({ optin: true, unsub: true });

  return (
    <div className="space-y-8">
      <PageHeader title="Bülten" description="Abonelerini yönet, bülten gönder ve otomatik bülten dizilerini kur.">
        <Button onClick={() => toast.info("Yeni bülten editörü yakında.")}>
          <Plus className="size-4" />
          Yeni Bülten
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={cn("border-l-4", k.bar)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
                <span className={cn("flex size-9 items-center justify-center rounded-lg", k.tone)}><Icon className="size-5" /></span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
                <p className="mt-1 text-xs font-medium text-positive">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bültenler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Mail className="size-4 text-primary" />Bültenler</CardTitle>
            <Button size="sm" onClick={() => toast.info("Yeni bülten editörü yakında.")}><Plus className="size-4" />Yeni Bülten</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {NEWSLETTERS.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-xl border p-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", n.status === "sent" ? "bg-positive/10 text-positive" : "bg-warning/12 text-amber-600")}>
                  {n.status === "sent" ? <CheckCircle2 className="size-4" /> : <Pencil className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {n.title}
                    {n.status === "draft" && <span className="rounded-full bg-warning/12 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">Taslak</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{n.meta}</p>
                </div>
                {n.status === "sent" ? (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => toast.info("Rapor (demo).")}>Rapor</Button>
                    <Button variant="outline" size="sm" onClick={() => toast.success("Kopyalandı (demo).")}>Kopyala</Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => toast.info("Düzenleme yakında.")}><Pencil className="size-3.5" />Düzenle</Button>
                    <Button size="sm" onClick={() => toast.success("Bülten gönderildi (demo).")}><Send className="size-3.5" />Gönder</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Abone listesi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" />Abone Listesi</CardTitle>
            <Button variant="outline" size="sm" onClick={() => toast.success("Dışa aktarıldı (demo).")}><Download className="size-4" />Dışa Aktar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5">
              <StatBar label="Aktif Aboneler" value="1.284" pct={100} color="bg-positive" valueColor="text-positive" />
              <StatBar label="Abonelikten Çıkan" value="73" pct={6} color="bg-danger" valueColor="text-danger" />
              <StatBar label="Bounce" value="21" pct={2} color="bg-amber-500" valueColor="text-amber-600" />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kaynak Dağılımı</p>
              <ul className="space-y-1.5">
                {SOURCES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" />{s.label}</span>
                      <span className="font-semibold tabular-nums">{s.value}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Etiket ile otomatik bülten */}
      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><Zap className="size-4 text-primary" />Etiket ile Otomatik Bülten Başlatma</CardTitle>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Otomasyon</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-primary/[0.06] p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            Bir müşteriye seçili etiket eklendiğinde, ilgili bülten dizisi <strong className="text-foreground">otomatik başlar</strong> ve müşteri abone listesine eklenir.
          </div>
          {rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
              <span className="text-sm text-muted-foreground">Etiket eklenince:</span>
              <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm font-medium">{r.tag}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-sm text-muted-foreground">Bülten dizisi:</span>
              <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm font-medium">{r.series}</span>
              <div className="ml-auto flex items-center gap-2">
                <Switch on={r.on} onClick={() => setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))} />
                <Button variant="outline" size="icon-sm" className="text-danger" onClick={() => setRules((prev) => prev.filter((x) => x.id !== r.id))}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => toast.info("Yeni kural ekleme yakında.")}><Plus className="size-4" />Yeni Kural Ekle</Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Gönderici ayarları */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Gönderici Ayarları</CardTitle>
            <Button size="sm" onClick={() => toast.success("Ayarlar kaydedildi (demo).")}>Kaydet</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Gönderici Adı" defaultValue="Defne Beauty Center" />
            <Field label="Gönderici E-posta" defaultValue="bulten@defnebeauty.com" />
            <Field label="Yanıt E-postası" defaultValue="info@defnebeauty.com" />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Varsayılan İmza</label>
              <textarea rows={3} defaultValue={"Sevgilerimizle,\nDefne Beauty Center"} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* GDPR & İzin */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" />GDPR & İzin</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-positive/10 text-positive"><CheckCircle2 className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Çift Onay (Double Opt-in)</p>
                <p className="text-xs text-muted-foreground">Abone olunca onay e-postası gönderilir</p>
              </div>
              <Switch on={gdpr.optin} onClick={() => setGdpr((g) => ({ ...g, optin: !g.optin }))} />
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-positive/10 text-positive"><CheckCircle2 className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Abonelikten Çıkma Linki</p>
                <p className="text-xs text-muted-foreground">Her bültende otomatik eklenir</p>
              </div>
              <Switch on={gdpr.unsub} onClick={() => setGdpr((g) => ({ ...g, unsub: !g.unsub }))} />
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">KVKK Metni</p>
                <p className="text-xs text-muted-foreground">Abone formunda görüntülenir</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("KVKK düzenleme yakında.")}>Düzenle</Button>
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><History className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">İzin Geçmişi</p>
                <p className="text-xs text-muted-foreground">Tüm onaylar kayıt altında</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("İzin geçmişi (demo).")}>Görüntüle</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBar({ label, value, pct, color, valueColor }: { label: string; value: string; pct: number; color: string; valueColor: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums", valueColor)}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}
