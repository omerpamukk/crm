"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Copy, Check, Ban, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";

import {
  AGENCY_SECTIONS,
  AGENCY_PERMISSIONS,
  AGENCY_DURATIONS,
  agencyPermissionLabel,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AgencyAccess } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createAgencyAccess,
  revokeAgencyAccess,
  renewAgencyAccess,
} from "./agency-actions";

const ALL_KEYS = AGENCY_SECTIONS.map((s) => s.key);

function genToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function remainingText(a: AgencyAccess): string {
  if (!a.is_active) return "Pasif";
  if (!a.expires_at) return "Süresiz";
  const diff = new Date(a.expires_at).getTime() - Date.now();
  if (diff <= 0) return "Süresi doldu";
  const days = Math.ceil(diff / 86_400_000);
  if (days >= 30) return `${Math.floor(days / 30)} ay kaldı`;
  return `${days} gün kaldı`;
}

function isExpired(a: AgencyAccess): boolean {
  return !a.is_active || (!!a.expires_at && new Date(a.expires_at).getTime() <= Date.now());
}

export function AgencyPanelDialog({ existing }: { existing: AgencyAccess[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("180");
  const [permission, setPermission] = useState("view");
  const [note, setNote] = useState("");
  const [token, setToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      if (!token) setToken(genToken());
      if (typeof window !== "undefined") setOrigin(window.location.origin);
    }
  }

  const link = origin && token ? `${origin}/ajans/${token}` : "";

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Bağlantı kopyalandı");
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    const result = await createAgencyAccess({
      name,
      email,
      token,
      sections: [...selected],
      permission,
      days: Number(days),
      note,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Ajans paneli oluşturuldu");
    setName("");
    setEmail("");
    setNote("");
    setToken(genToken());
    router.refresh();
  }

  async function handleRevoke(id: string) {
    const r = await revokeAgencyAccess(id);
    if (r.error) toast.error(r.error);
    else {
      toast.success("Erişim kapatıldı");
      router.refresh();
    }
  }

  async function handleRenew(id: string) {
    const r = await renewAgencyAccess(id);
    if (r.error) toast.error(r.error);
    else {
      toast.success("Erişim 3 ay uzatıldı");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white hover:opacity-90">
          <Store className="size-4" />
          Ajans Paneli Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary">Ajans Paneli Oluştur</DialogTitle>
          <DialogDescription>
            Ajansa hangi bölümleri göstermek istediğinizi seçin, ardından erişim verin.
          </DialogDescription>
        </DialogHeader>

        {/* Bölüm seçimi */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Yönetici Paneli Bölümleri
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AGENCY_SECTIONS.map((s) => {
              const checked = selected.has(s.key);
              return (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => toggle(s.key)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/[0.04]"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                      checked ? "border-primary bg-primary text-white" : "border-input"
                    )}
                  >
                    {checked && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">
                      {s.emoji} {s.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 rounded-lg bg-primary/[0.06] px-3 py-2 text-sm text-primary">
            {selected.size} bölüm seçildi — ajans sadece bunları görecek.
          </p>
        </div>

        {/* Erişim formu */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ajansa Erişim Ver
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ag-name">Ajans / Kişi adı *</Label>
              <Input id="ag-name" placeholder="Örn: Dijital Ajans Pro" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-email">E-posta adresi</Label>
              <Input id="ag-email" type="email" placeholder="ajans@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Erişim süresi</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENCY_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Yetki seviyesi</Label>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENCY_PERMISSIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-note">Davet notu (isteğe bağlı)</Label>
            <Textarea id="ag-note" rows={2} placeholder="Ajansa iletmek istediğiniz özel not..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* Bağlantı önizleme */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Oluşturulacak özel erişim bağlantısı</p>
              <p className="truncate text-sm font-medium">{link || "…"}</p>
            </div>
            <Button type="button" variant="outline" size="icon-sm" onClick={copyLink} disabled={!link}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Mevcut erişimler */}
        {existing.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Mevcut Ajans Erişimleri</p>
            <ul className="space-y-2">
              {existing.map((a) => {
                const expired = isExpired(a);
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-xs font-semibold text-white">
                      {a.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.email ?? "—"} · {agencyPermissionLabel(a.permission)} · {remainingText(a)}
                      </p>
                    </div>
                    <Badge variant={expired ? "secondary" : "positive"}>
                      {expired ? "Pasif" : "Aktif"}
                    </Badge>
                    {expired ? (
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleRenew(a.id)}>
                        <RefreshCw className="size-3.5" /> Yenile
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => handleRevoke(a.id)} title="Erişimi kapat">
                        <Ban className="size-4 text-danger" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
          <Button
            className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white hover:opacity-90"
            onClick={handleCreate}
            disabled={submitting}
          >
            <Store className="size-4" />
            {submitting ? "Oluşturuluyor..." : "Paneli Oluştur & Erişim Ver"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
