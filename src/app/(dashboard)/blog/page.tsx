"use client";

import { useState } from "react";
import {
  Newspaper,
  Zap,
  PenLine,
  Bot,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  { title: "Kolay İçerik Editörü", desc: "Sürükle-bırak ile dakikalar içinde blog yazısı oluştur", icon: PenLine },
  { title: "AI İle Yazı Üret", desc: "AI, sektörüne özel blog içerikleri oluşturur", icon: Bot },
  { title: "SEO Optimize", desc: "Her yazı otomatik SEO başlığı, meta açıklaması alır", icon: TrendingUp },
];

const DEMO_POSTS = [
  { id: "b1", title: "Yaz Aylarında Cilt Bakımı: 7 Altın Kural", status: "Yayında", views: 1240, date: "12 Haz 2026" },
  { id: "b2", title: "Lazer Epilasyon Hakkında Merak Edilenler", status: "Yayında", views: 880, date: "5 Haz 2026" },
  { id: "b3", title: "Kalıcı Makyaj Sonrası Bakım Rehberi", status: "Taslak", views: null as number | null, date: "Bugün" },
];

export default function BlogPage() {
  const [active, setActive] = useState(false);
  const [posts, setPosts] = useState(DEMO_POSTS);

  return (
    <div className="space-y-8">
      <PageHeader title="Blog" description="Blog yazılarınla SEO gücünü artır, organik trafik kazan.">
        {active && (
          <Button onClick={() => toast.info("Yeni yazı editörü yakında.")}>
            <Plus className="size-4" />
            Yeni Yazı
          </Button>
        )}
      </PageHeader>

      {!active ? (
        <>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Newspaper className="size-8" />
              </span>
              <div>
                <h2 className="text-xl font-bold">Blog Henüz Aktif Değil</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Blogunuzu aktifleştirerek SEO gücünüzü artırın, müşterilerinizle içerik paylaşın ve organik trafik kazanın.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 py-2">
                <div><p className="text-2xl font-bold text-primary">%47</p><p className="text-xs text-muted-foreground">Daha Fazla Trafik</p></div>
                <div><p className="text-2xl font-bold text-positive">3x</p><p className="text-xs text-muted-foreground">Müşteri Bağlılığı</p></div>
                <div><p className="text-2xl font-bold text-amber-600">+62</p><p className="text-xs text-muted-foreground">SEO Puanı</p></div>
              </div>
              <Button size="lg" onClick={() => { setActive(true); toast.success("Blog aktifleştirildi"); }}>
                <Zap className="size-4" />
                Blogu Aktifleştir
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title}>
                  <CardContent className="space-y-2 p-5 text-center">
                    <Icon className="mx-auto size-6 text-primary" />
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Newspaper className="size-4 text-primary" />
              Blog Yazıları
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{posts.length}</span>
            </CardTitle>
            <Button size="sm" onClick={() => toast.info("Yeni yazı editörü yakında.")}>
              <Plus className="size-4" />
              Yeni Yazı
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {posts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Newspaper className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.date}{p.views != null ? ` · ${p.views.toLocaleString("tr-TR")} okunma` : ""}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", p.status === "Yayında" ? "bg-positive/12 text-positive" : "bg-warning/12 text-amber-600")}>
                    {p.status}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="icon-sm" onClick={() => toast.info("Önizleme (demo).")}><Eye className="size-3.5" /></Button>
                    <Button variant="outline" size="icon-sm" onClick={() => toast.info("Düzenleme yakında.")}><Pencil className="size-3.5" /></Button>
                    <Button variant="outline" size="icon-sm" className="text-danger" onClick={() => { setPosts((prev) => prev.filter((x) => x.id !== p.id)); toast.success("Yazı silindi"); }}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
