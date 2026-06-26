"use client";

import { useState } from "react";
import {
  MapPin,
  Star,
  Search,
  Route,
  Phone,
  CheckCircle2,
  Settings2,
  Building2,
  Map as MapIcon,
  ExternalLink,
  Bell,
  MessageSquare,
  Upload,
  Plus,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KPIS = [
  { label: "Ortalama Puan", value: "4.8", icon: Star, tone: "bg-warning/12 text-amber-500", color: "text-amber-500", sub: "127 yorum" },
  { label: "Aylık Görüntülenme", value: "1.8K", icon: Search, tone: "bg-sky-100 text-sky-600", color: "", sub: "+12%" },
  { label: "Yol Tarifi İsteği", value: "248", icon: Route, tone: "bg-positive/10 text-positive", color: "", sub: "Bu ay" },
  { label: "Aramalar", value: "84", icon: Phone, tone: "bg-violet-100 text-violet-600", color: "", sub: "+6" },
];

const RATING_DIST = [
  { star: 5, pct: 78 },
  { star: 4, pct: 14 },
  { star: 3, pct: 5 },
  { star: 2, pct: 2 },
  { star: 1, pct: 1 },
];

type Review = { id: string; name: string; rating: number; when: string; text: string; status: "bekliyor" | "acil" | "yanitlandi"; reply?: string };

const REVIEWS: Review[] = [
  { id: "r1", name: "Ayşe Yılmaz", rating: 5, when: "2 gün önce", text: "Harika hizmet! Kesinlikle tavsiye ederim. Personel çok ilgili ve güler yüzlüydü. Lazer epilasyon için 3. seansım ve her seferinde çok memnun kaldım.", status: "bekliyor" },
  { id: "r2", name: "Mehmet K.", rating: 4, when: "1 hafta önce", text: "Çok memnun kaldım, fiyatlar uygun ve kalite gayet iyi. Bir daha geleceğim, herkese tavsiye ederim.", status: "bekliyor" },
  { id: "r3", name: "Fatma D.", rating: 2, when: "3 gün önce", text: "Bekleme süresi çok uzundu, randevuyu beklemek zorunda kaldım. Hizmet kalitesi iyiydi ama zaman yönetimi geliştirilmeli.", status: "acil" },
  { id: "r4", name: "Selin Çelik", rating: 5, when: "2 hafta önce", text: "Personel çok ilgili ve profesyonel. Özellikle Zeynep Hanım çok alakalıydı.", status: "bekliyor" },
  { id: "r5", name: "Kemal A.", rating: 5, when: "3 hafta önce", text: "Temiz ortam, güler yüzlü personel. Kesinlikle tavsiye ederim!", status: "yanitlandi", reply: "Teşekkürler Kemal Bey! Sizi tekrar ağırlamayı dört gözle bekliyoruz 😊" },
];

const PHOTOS = ["from-violet-400 to-indigo-500", "from-pink-400 to-rose-400", "from-sky-400 to-cyan-400", "from-emerald-400 to-green-500", "from-amber-400 to-orange-500"];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

export default function YorumlarPage() {
  const [pending, setPending] = useState(REVIEWS.filter((r) => r.status !== "yanitlandi").length);

  function reply(name: string) {
    setPending((p) => Math.max(0, p - 1));
    toast.success(`${name} yorumuna yanıt gönderildi (demo).`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Google Maps & Yorumlar" description="Google İşletme profilini, yorumları ve harita performansını yönet." />

      {/* Bağlı profil bandı */}
      <Card className="border-positive/40 bg-positive/[0.04]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-card text-positive shadow-xs"><MapPin className="size-5" /></span>
            <div>
              <p className="font-semibold leading-tight">Google İşletme Profili</p>
              <p className="text-xs text-muted-foreground">Defne Beauty Center · Bağcılar, İstanbul</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-positive/12 px-2 py-1 text-xs font-medium text-positive"><CheckCircle2 className="size-3.5" />Bağlı</span>
            <Button variant="outline" size="sm" onClick={() => toast.info("Profil yönetimi (demo).")}><Settings2 className="size-4" />Profili Yönet</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI'lar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
                <span className={cn("flex size-9 items-center justify-center rounded-lg", k.tone)}><Icon className="size-5" /></span>
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold tracking-tight", k.color)}>{k.value}</div>
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-positive"><TrendingUp className="size-3" />{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* İşletme bilgileri */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-primary" />İşletme Bilgileri</CardTitle>
            <Button size="sm" onClick={() => toast.success("İşletme bilgileri kaydedildi (demo).")}>Kaydet</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="İşletme Adı" defaultValue="Defne Beauty Center" />
            <Field label="Kategori" defaultValue="Güzellik Salonu" />
            <Field label="Adres" defaultValue="Bağcılar, İstanbul, Türkiye" />
            <Field label="Telefon" defaultValue="+90 532 000 0000" />
            <Field label="Web Sitesi" defaultValue="www.defnebeauty.com" />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Çalışma Saatleri</label>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>Pzt – Cmt</span>
                <span className="flex items-center gap-1">
                  <input defaultValue="09:00" className="h-8 w-16 rounded border border-input bg-background px-2 text-center text-xs" />
                  <span>–</span>
                  <input defaultValue="20:00" className="h-8 w-16 rounded border border-input bg-background px-2 text-center text-xs" />
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>Pazar</span>
                <span className="font-medium text-danger">Kapalı</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Harita önizleme + puan dağılımı */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapIcon className="size-4 text-primary" />Harita Önizleme</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50">
              <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]" />
              <div className="relative flex flex-col items-center gap-1">
                <MapPin className="size-7 fill-danger/20 text-danger" />
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium shadow-sm">Defne Beauty Center</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => toast.info("Google Maps'te aç (demo).")}>
              <ExternalLink className="size-4" />Google Maps&apos;te Görüntüle
            </Button>
            <div>
              <p className="mb-2 text-sm font-medium">Puan Dağılımı</p>
              <div className="space-y-1.5">
                {RATING_DIST.map((r) => (
                  <div key={r.star} className="flex items-center gap-2 text-xs">
                    <span className="flex w-6 items-center gap-0.5 text-muted-foreground">{r.star}<Star className="size-3 fill-amber-400 text-amber-400" /></span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yorumlar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4 text-amber-500" />Müşteri Yorumları
            {pending > 0 && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-amber-600">{pending} yanıt bekliyor</span>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => toast.info("Maps'te aç (demo).")}><ExternalLink className="size-4" />Maps&apos;te Aç</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] p-3 text-sm">
              <Bell className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p><span className="font-semibold text-amber-700">{pending} yorum yanıt bekliyor</span> — Lütfen kısa sürede yanıtlayın, müşteri deneyimi için önemlidir.</p>
            </div>
          )}
          <ul className="divide-y">
            {REVIEWS.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium">{r.name}</span>
                        <span className="ml-2"><Stars n={r.rating} /></span>
                        <p className="text-xs text-muted-foreground">{r.when} · Google</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === "yanitlandi" ? (
                          <span className="rounded-full bg-positive/12 px-2 py-0.5 text-xs font-medium text-positive">Yanıtlandı</span>
                        ) : (
                          <>
                            {r.status === "acil"
                              ? <span className="rounded-full bg-danger/12 px-2 py-0.5 text-xs font-medium text-danger">Acil Yanıt</span>
                              : <span className="rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-amber-600">Yanıt Bekliyor</span>}
                            <Button variant={r.status === "acil" ? "default" : "outline"} size="sm" className={r.status === "acil" ? "bg-danger text-white hover:bg-danger/90" : ""} onClick={() => reply(r.name)}>
                              <MessageSquare className="size-3.5" />Yanıtla
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">&quot;{r.text}&quot;</p>
                    {r.reply && (
                      <div className="mt-2 rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm">
                        <span className="font-medium">Yanıtınız:</span> {r.reply}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Fotoğraflar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="size-4 text-primary" />Google Fotoğrafları</CardTitle>
          <Button variant="outline" size="sm" onClick={() => toast.info("Fotoğraf ekleme (demo).")}><Upload className="size-4" />Fotoğraf Ekle</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {PHOTOS.map((g, i) => <div key={i} className={cn("aspect-square rounded-xl bg-gradient-to-br", g)} />)}
            <button type="button" onClick={() => toast.info("Fotoğraf ekleme (demo).")} className="flex aspect-square items-center justify-center rounded-xl border border-dashed text-muted-foreground transition-colors hover:bg-muted/40">
              <Plus className="size-6" />
            </button>
          </div>
        </CardContent>
      </Card>
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
