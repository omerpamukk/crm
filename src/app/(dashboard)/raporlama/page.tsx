"use client";

import { useState } from "react";
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Banknote,
  Users,
  PieChart,
  ListChecks,
  CreditCard,
  UserCheck,
  Sun,
  Moon,
  Send,
  Plus,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK = ["Bu Ay", "Geçen Ay", "Son 3 Ay", "Son 6 Ay", "Bu Yıl"];

const REPORT_TYPES = [
  { title: "Ciro Raporu", short: "Gelir, gider, net kâr analizi", desc: "Aylık/yıllık ciro, hizmet bazlı gelir, net kâr marjı ve trend analizi içerir.", icon: Banknote, tone: "bg-positive/10 text-positive" },
  { title: "Personel Performansı", short: "Çalışan bazlı üretkenlik", desc: "Personel başına seans sayısı, ciro katkısı, müşteri memnuniyeti puanı.", icon: Users, tone: "bg-primary/10 text-primary" },
  { title: "Müşteri Kaynağı", short: "Nereden geliyor müşteriler", desc: "Instagram, WhatsApp, Web, Telefon kanal bazlı müşteri ve ciro dağılımı.", icon: PieChart, tone: "bg-violet-100 text-violet-600" },
  { title: "Hizmet Bazlı Satış", short: "Hangi hizmet ne kadar satıyor", desc: "Hizmet bazlı satış adedi, toplam ciro, kârlılık oranı karşılaştırması.", icon: ListChecks, tone: "bg-warning/12 text-amber-600" },
  { title: "Ödeme Durumu", short: "Tahsilat ve gecikme analizi", desc: "Tahsil edilen, geciken ve bekleyen ödemeler; müşteri bazlı borç listesi.", icon: CreditCard, tone: "bg-pink-100 text-pink-600" },
  { title: "Müşteri Analizi", short: "Müşteri profili ve davranışları", desc: "Aktif/pasif müşteri sayısı, ortalama değer, tekrar ziyaret oranı, kayıp analizi.", icon: UserCheck, tone: "bg-sky-100 text-sky-600" },
];

export default function RaporlamaPage() {
  const [quick, setQuick] = useState("Bu Ay");
  const [type, setType] = useState("Ciro Raporu");

  const exp = (fmt: string, name: string) => toast.success(`${name} — ${fmt} olarak indiriliyor (demo).`);

  return (
    <div className="space-y-6">
      <PageHeader title="Rapor Oluştur" description="Dönem seç, rapor türünü belirle ve Excel/PDF olarak dışa aktar; otomatik özetleri kur." />

      {/* Rapor oluşturucu */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileBarChart className="size-4 text-primary" />Rapor Oluştur</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto_auto] lg:items-end">
            <Field label="Başlangıç Tarihi" type="date" defaultValue="2026-05-01" />
            <Field label="Bitiş Tarihi" type="date" defaultValue="2026-05-30" />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rapor Türü</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                {REPORT_TYPES.map((r) => <option key={r.title}>{r.title}</option>)}
              </select>
            </div>
            <Button variant="outline" onClick={() => exp("Excel", type)}><FileSpreadsheet className="size-4" />Excel</Button>
            <Button onClick={() => exp("PDF", type)}><FileText className="size-4" />PDF</Button>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hızlı Filtreler</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => setQuick(q)}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", quick === q ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rapor türü kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.title}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-xl", r.tone)}><Icon className="size-5" /></span>
                  <div>
                    <p className="font-semibold leading-tight">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.short}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => exp("Excel", r.title)}><FileSpreadsheet className="size-4" />Excel</Button>
                  <Button size="sm" className="flex-1" onClick={() => exp("PDF", r.title)}><FileText className="size-4" />PDF</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Otomatik özet raporları */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Clock className="size-5 text-primary" />Otomatik Özet Raporları</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <DigestCard
            kind="morning"
            title="Sabah Özeti"
            icon={Sun}
            accent="border-l-amber-400"
            time="09:00"
            items={["Günlük randevular", "Yanıtsız mesajlar", "Bekleyen görevler", "Dünkü satış", "Google yorumları", "Kritik stok"]}
            checked={[true, true, true, true, true, false]}
            preview={["📅 6 randevu planlı", "📨 4 yanıtsız mesaj bekliyor", "✅ 3 bekleyen görev", "💰 Dün ₺12.400 satış"]}
            previewTitle="Önizleme — 31 Mayıs 2026"
            recipients={["Atahan T.", "Ayşe Y."]}
          />
          <DigestCard
            kind="evening"
            title="Gün Sonu Özeti"
            icon={Moon}
            accent="border-l-violet-400"
            time="20:00"
            items={["Günlük satış toplamı", "Tamamlanan seanslar", "Mesaj istatistiği", "Görev özeti", "Google puanı", "Yarın randevular"]}
            checked={[true, true, true, true, true, false]}
            preview={["💰 Toplam ₺12.400 satış", "✅ 5 seans tamamlandı", "📌 4 görev tamamlandı", "⭐ Google: 4.9 / 5.0"]}
            previewTitle="Önizleme — 30 Mayıs 2026"
            recipients={["Atahan T.", "Zeynep D.", "Mehmet K."]}
          />
        </div>
      </div>
    </div>
  );
}

function DigestCard({
  title, icon: Icon, accent, time: t0, items, checked: c0, preview, previewTitle, recipients: r0,
}: {
  kind: string; title: string; icon: typeof Sun; accent: string; time: string;
  items: string[]; checked: boolean[]; preview: string[]; previewTitle: string; recipients: string[];
}) {
  const [on, setOn] = useState(true);
  const [time, setTime] = useState(t0);
  const [checks, setChecks] = useState(c0);
  const [recipients, setRecipients] = useState(r0);

  return (
    <Card className={cn("border-l-4", accent)}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("size-5", title.includes("Sabah") ? "text-amber-500" : "text-violet-500")} />
            <div>
              <p className="font-semibold leading-tight">{title}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Gönderim saati:
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded border border-input bg-background px-1.5 py-0.5 text-xs" />
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setOn((v) => !v)} aria-pressed={on}
            className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
            <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Raporda gösterilecekler:</p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((it, i) => (
              <label key={it} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={checks[i]} onChange={() => setChecks((p) => p.map((v, j) => (j === i ? !v : v)))} className="size-4 accent-primary" />
                {it}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="mb-1.5 text-sm font-semibold">{previewTitle}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {preview.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Gönderilecek kişiler:</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {recipients.map((r, i) => (
              <span key={r} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {r}
                {i > 0 && <button type="button" onClick={() => setRecipients((p) => p.filter((x) => x !== r))}><X className="size-3" /></button>}
              </span>
            ))}
            <button type="button" onClick={() => toast.info("Personel ekleme (demo).")} className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/40">
              <Plus className="size-3" />Personel Ekle
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info("WhatsApp kanalı seçildi (demo).")}>WhatsApp</Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info("SMS kanalı seçildi (demo).")}>SMS</Button>
          <Button size="sm" className="flex-1" onClick={() => toast.success(`${title} gönderildi (demo).`)}><Send className="size-4" />Şimdi Gönder</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, type = "text", defaultValue }: { label: string; type?: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input type={type} defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}
