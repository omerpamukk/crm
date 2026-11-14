"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, CircleCheck, Copy } from "lucide-react";
import { toast } from "sonner";

import { SECTORS } from "@/lib/constants";
import { presetForSector } from "@/lib/modules";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { ModulePicker } from "../module-picker";
import { provisionBusiness } from "./actions";

const PLANS = [
  { value: "trial", label: "Deneme" },
  { value: "temel", label: "Temel" },
  { value: "pro", label: "Pro" },
];

const SELECT =
  "h-11 w-full rounded-[var(--radius-ctl)] border border-transparent bg-fill px-3 text-base text-label outline-none hover:bg-fill-2 focus-visible:border-[color:var(--primary)] focus-visible:shadow-[0_0_0_3px_var(--focus)] md:h-9 md:text-[0.875rem]";

const EMPTY = { businessName: "", sector: SECTORS[0].value as string, fullName: "", email: "", password: "", plan: "trial" };

export default function FirmaOlusturPage() {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY);
  const [modules, setModules] = useState<string[]>(() => presetForSector(EMPTY.sector));
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  function changeSector(sector: string) {
    setForm((p) => ({ ...p, sector }));
    if (!touched) setModules(presetForSector(sector));
  }

  function submit() {
    startTransition(async () => {
      const res = await provisionBusiness({ ...form, modules });
      if (!res.ok || !res.credentials) {
        toast.error(res.error ?? "Firma oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.");
        return;
      }
      setDone(res.credentials);
      toast.success("Firma oluşturuldu");
    });
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı`);
  }

  const back = (
    <Link href="/admin" className="focus-ring inline-flex items-center gap-0.5 rounded text-[0.9375rem] text-primary-text">
      <ChevronLeft className="size-5" />
      Firmalar
    </Link>
  );

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {back}
        <div className="surface space-y-5 p-6 text-center">
          <CircleCheck className="mx-auto size-12 text-positive-text" />
          <div>
            <h1 className="text-title-3 font-semibold">Firma oluşturuldu</h1>
            <p className="mt-1 text-subhead text-label-2">Giriş bilgilerini firmaya iletin. Şifre yalnızca şimdi gösteriliyor.</p>
          </div>
          <ul className="space-y-2 text-left">
            {[
              { label: "E-posta", value: done.email },
              { label: "Şifre", value: done.password },
            ].map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-2 rounded-xl bg-fill p-3">
                <div className="min-w-0">
                  <p className="text-footnote text-label-2">{r.label}</p>
                  <p className="truncate font-mono text-[0.9375rem]">{r.value}</p>
                </div>
                <Button variant="secondary" size="icon-sm" onClick={() => copy(r.value, r.label)} aria-label={`${r.label} kopyala`}>
                  <Copy />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setDone(null);
                setForm(EMPTY);
                setModules(presetForSector(EMPTY.sector));
                setTouched(false);
              }}
            >
              Bir firma daha
            </Button>
            <Link href="/admin" className={cn(buttonVariants(), "flex-1")}>
              Firmalara dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {back}
      <h1 className="page-title">Yeni firma</h1>

      <div className="surface space-y-4 p-4 md:p-5">
        <Field id="f-name" label="Firma adı" value={form.businessName} onChange={set("businessName")} placeholder="Örn. Defne Güzellik" />
        <div className="space-y-2">
          <Label htmlFor="f-sector">Sektör</Label>
          <select id="f-sector" value={form.sector} onChange={(e) => changeSector(e.target.value)} className={SELECT}>
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-plan">Abonelik</Label>
          <select id="f-plan" value={form.plan} onChange={set("plan")} className={SELECT}>
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="section-title mx-1">Yönetici kullanıcı</h2>
        <div className="surface space-y-4 p-4 md:p-5">
          <Field id="f-full" label="Ad soyad" value={form.fullName} onChange={set("fullName")} placeholder="Firma yetkilisi" />
          <Field id="f-mail" label="E-posta" type="email" value={form.email} onChange={set("email")} placeholder="ornek@firma.com" />
          <Field id="f-pass" label="Şifre" value={form.password} onChange={set("password")} placeholder="Boş bırakırsan otomatik üretilir" />
        </div>
      </div>

      <ModulePicker
        value={modules}
        onChange={(next) => {
          setTouched(true);
          setModules(next);
        }}
        detail="Sektöre göre hazır işaretlendi."
      />

      <div className="space-y-2">
        <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
          {pending ? "Oluşturuluyor…" : "Firmayı oluştur"}
        </Button>
        <p className="text-center text-footnote text-label-2">Firmaya e-posta gitmez; giriş bilgisi ekranda gösterilir, sen iletirsin.</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} className="h-11 md:h-9" />
    </div>
  );
}
