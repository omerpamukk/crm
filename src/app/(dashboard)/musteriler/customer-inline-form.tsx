"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Check } from "lucide-react";
import { toast } from "sonner";

import { CUSTOMER_SOURCES, CUSTOMER_TAG_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createCustomerWithDetails } from "./actions";

const TAG_TONE: Record<string, string> = {
  info: "bg-primary/10 text-primary ring-primary/20",
  positive: "bg-positive/12 text-positive ring-positive/20",
  warning: "bg-warning/15 text-amber-700 ring-warning/30",
};

export function CustomerInlineForm({
  services,
  onClose,
}: {
  services: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("none");
  const [totalSessions, setTotalSessions] = useState("");
  const [sessionDays, setSessionDays] = useState("");
  const [source, setSource] = useState("none");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(label: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    const result = await createCustomerWithDetails({
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      service: service === "none" ? undefined : service,
      total_sessions: totalSessions,
      session_days: sessionDays,
      source: source === "none" ? undefined : source,
      tags: [...tags],
      note,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Müşteri eklendi");
    router.refresh();
    onClose();
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <UserPlus className="size-4 text-primary" />
          Yeni Müşteri Ekle
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cf-first">Ad *</Label>
            <Input id="cf-first" placeholder="Zeynep" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-last">Soyad</Label>
            <Input id="cf-last" placeholder="Arslan" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-phone">Telefon</Label>
            <Input id="cf-phone" placeholder="+90 5xx xxx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-email">E-posta</Label>
            <Input id="cf-email" type="email" placeholder="zeynep@ornek.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hizmet</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Hizmet seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Seçilmedi —</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-total">Toplam Seans</Label>
            <Input id="cf-total" inputMode="numeric" placeholder="6" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value.replace(/[^\d]/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-days">Seans Günleri</Label>
            <Input id="cf-days" placeholder="Sal, Per · 10:00" value={sessionDays} onChange={(e) => setSessionDays(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kaynak</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Kaynak seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Seçilmedi —</SelectItem>
                {CUSTOMER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Etiketler</Label>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_TAG_PRESETS.map((t) => {
                const active = tags.has(t.label);
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => toggleTag(t.label)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all",
                      active
                        ? TAG_TONE[t.tone]
                        : "bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted"
                    )}
                  >
                    {active && <Check className="size-3" strokeWidth={3} />}
                    <span>{t.emoji} {t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-note">Not</Label>
            <Textarea id="cf-note" rows={3} placeholder="Müşteri hakkında not..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button className="gap-1.5" onClick={handleSave} disabled={submitting}>
            <UserPlus className="size-4" />
            {submitting ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
          </Button>
          <Button variant="outline" onClick={onClose}>İptal</Button>
        </div>
      </div>
    </div>
  );
}
