"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { SECTORS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { provisionBusiness } from "./actions";

const PLANS = [
  { value: "trial", label: "Deneme" },
  { value: "temel", label: "Temel" },
  { value: "pro", label: "Pro" },
];

export default function FirmaOlusturPage() {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ businessName: "", sector: SECTORS[0].value, fullName: "", email: "", password: "", plan: "trial" });
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    startTransition(async () => {
      const res = await provisionBusiness(form);
      if (!res.ok || !res.credentials) {
        toast.error(res.error ?? "Bir hata oluştu.");
        return;
      }
      setDone(res.credentials);
      toast.success("Firma ve kullanıcı oluşturuldu");
    });
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı`);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Firmalar</Link>
        <Card>
          <CardContent className="space-y-5 p-6 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-positive/12 text-positive"><CheckCircle2 className="size-8" /></span>
            <div>
              <h1 className="text-xl font-bold">Firma oluşturuldu 🎉</h1>
              <p className="mt-1 text-sm text-muted-foreground">Aşağıdaki giriş bilgilerini firmaya iletin. Bu şifre yalnızca şimdi gösteriliyor.</p>
            </div>
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">E-posta</p><p className="truncate font-mono text-sm">{done.email}</p></div>
                <Button variant="outline" size="icon-sm" onClick={() => copy(done.email, "E-posta")}><Copy className="size-3.5" /></Button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">Şifre</p><p className="truncate font-mono text-sm">{done.password}</p></div>
                <Button variant="outline" size="icon-sm" onClick={() => copy(done.password, "Şifre")}><Copy className="size-3.5" /></Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDone(null); setForm({ businessName: "", sector: SECTORS[0].value, fullName: "", email: "", password: "", plan: "trial" }); }}>Yeni Firma</Button>
              <Link href="/admin" className={cn(buttonVariants(), "flex-1")}>Firmalara Dön</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Firmalar</Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-primary" />Yeni Firma Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Firma Adı" value={form.businessName} onChange={set("businessName")} placeholder="Örn. Defne Beauty Center" />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sektör</label>
            <select value={form.sector} onChange={set("sector")} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">İlk Kullanıcı (Yönetici)</p>
            <div className="space-y-3">
              <Field label="Ad Soyad" value={form.fullName} onChange={set("fullName")} placeholder="Yetkilinin adı" />
              <Field label="E-posta" type="email" value={form.email} onChange={set("email")} placeholder="ornek@firma.com" />
              <Field label="Şifre (boş bırakılırsa otomatik üretilir)" value={form.password} onChange={set("password")} placeholder="Otomatik üret" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abonelik Planı</label>
            <select value={form.plan} onChange={set("plan")} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <Button className="w-full" onClick={submit} disabled={pending}>
            <KeyRound className="size-4" />
            {pending ? "Oluşturuluyor…" : "Firma + Kullanıcı Oluştur"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Kullanıcıya e-posta GÖNDERİLMEZ; giriş bilgisi ekranda gösterilir, siz iletirsiniz.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}
