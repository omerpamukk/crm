"use client";

import { useState } from "react";
import {
  FileSignature,
  Upload,
  PenTool,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Doc = { id: string; name: string; type: "PDF" | "DOC" | "JPG"; date: string; size: string; signed: boolean };

const INITIAL: Doc[] = [
  { id: "d1", name: "Hizmet Sözleşmesi — Elif Yıldız.pdf", type: "PDF", date: "22 Mayıs 2026", size: "1.2 MB", signed: true },
  { id: "d2", name: "Gizlilik Sözleşmesi — Genel.docx", type: "DOC", date: "25 Mayıs 2026", size: "0.4 MB", signed: false },
  { id: "d3", name: "Müşteri Onay Formu — Selin Kaya.jpg", type: "JPG", date: "18 Mayıs 2026", size: "0.8 MB", signed: true },
];

const TYPE_TONE: Record<Doc["type"], string> = {
  PDF: "bg-violet-100 text-violet-700",
  DOC: "bg-amber-100 text-amber-700",
  JPG: "bg-green-100 text-green-700",
};

export default function BelgelerPage() {
  const [docs, setDocs] = useState(INITIAL);

  function sign(id: string) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, signed: true } : d)));
    toast.success("Belge imzalandı (demo).");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Belge İmzalama" description="Sözleşme ve onam formlarını yükle, dijital olarak imzala ve sakla.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("İmza ayarlama (demo).")}>
            <PenTool className="size-4" />
            İmzamı Ayarla
          </Button>
          <Button onClick={() => toast.info("Belge yükleme (demo).")}>
            <Upload className="size-4" />
            Belge Yükle
          </Button>
        </div>
      </PageHeader>

      {/* Yükleme alanı */}
      <button
        type="button"
        onClick={() => toast.info("Belge yükleme (demo).")}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card/50 px-6 py-12 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="size-7" />
        </span>
        <div>
          <p className="font-semibold">Belgeyi buraya sürükle &amp; bırak</p>
          <p className="text-sm text-muted-foreground">ya da tıkla ve seç · PDF, Word, PNG, JPG desteklenir</p>
        </div>
      </button>

      {/* Belge listesi */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Belgeler</p>
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold", TYPE_TONE[d.type])}>
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.date} · {d.size}</p>
                </div>
                {d.signed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-positive/12 px-2 py-1 text-xs font-medium text-positive">
                    <CheckCircle2 className="size-3.5" />İmzalandı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-1 text-xs font-medium text-amber-600">
                    <Clock className="size-3.5" />İmza Bekliyor
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="outline" size="icon-sm" title="Önizle" onClick={() => toast.info("Önizleme (demo).")}><Eye className="size-3.5" /></Button>
                  {d.signed ? (
                    <Button variant="outline" size="icon-sm" title="İndir" onClick={() => toast.success("İndiriliyor (demo).")}><Download className="size-3.5" /></Button>
                  ) : (
                    <Button size="sm" onClick={() => sign(d.id)}><FileSignature className="size-3.5" />İmzala</Button>
                  )}
                  <Button variant="outline" size="icon-sm" className="text-danger" title="Sil" onClick={() => { setDocs((prev) => prev.filter((x) => x.id !== d.id)); toast.success("Belge silindi"); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
