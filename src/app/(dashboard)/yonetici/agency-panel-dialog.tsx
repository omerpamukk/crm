"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Copy,
  Check,
  Ban,
  RefreshCw,
  Link2,
  BarChart3,
  Banknote,
  Users,
  TrendingUp,
  PieChart,
  Globe,
  CircleDollarSign,
  Receipt,
  Megaphone,
  Sparkles,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
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

const SECTION_META: Record<string, { icon: LucideIcon; tone: string }> = {
  kazanc: { icon: BarChart3, tone: "bg-primary/10 text-primary" },
  ciro_netkar: { icon: Banknote, tone: "bg-positive/10 text-positive" },
  musteri_hizmet: { icon: Users, tone: "bg-primary/10 text-primary" },
  aylik_grafik: { icon: TrendingUp, tone: "bg-violet-500/10 text-violet-600" },
  hizmet_karlilik: { icon: PieChart, tone: "bg-warning/12 text-amber-600" },
  kaynak_gelir: { icon: Globe, tone: "bg-sky-500/10 text-sky-600" },
  gelir_girisi: { icon: CircleDollarSign, tone: "bg-positive/10 text-positive" },
  aylik_gider: { icon: Receipt, tone: "bg-danger/10 text-danger" },
  reklam_kampanya: { icon: Megaphone, tone: "bg-pink-500/10 text-pink-600" },
  potansiyel: { icon: Sparkles, tone: "bg-primary/10 text-primary" },
};

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
  const allSelected = selected.size === ALL_KEYS.length;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ALL_KEYS));
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        {/* Başlık (sabit) */}
        <DialogHeader className="shrink-0 gap-1.5 border-b px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white">
              <Store className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Ajans Paneli Oluştur</DialogTitle>
              <DialogDescription>
                Ajansa hangi bölümleri göstereceğinizi seçin, ardından erişim verin.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Gövde (kaydırılabilir) */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Bölüm seçimi */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Yönetici Paneli Bölümleri
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <CheckCheck className="size-3.5" />
                {allSelected ? "Tümünü kaldır" : "Tümünü seç"}
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {AGENCY_SECTIONS.map((s) => {
                const checked = selected.has(s.key);
                const meta = SECTION_META[s.key];
                const Icon = meta?.icon ?? Sparkles;
                return (
                  <button
                    type="button"
                    key={s.key}
                    onClick={() => toggle(s.key)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                      checked
                        ? "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/15"
                        : "border-border hover:border-foreground/15 hover:bg-muted/40"
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", meta?.tone)}>
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight">{s.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{s.desc}</span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        checked ? "border-primary bg-primary text-white" : "border-input bg-background"
                      )}
                    >
                      {checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/[0.06] px-3 py-2.5 text-sm text-primary">
              <Sparkles className="size-4 shrink-0" />
              <span>
                <strong>{selected.size}</strong> bölüm seçildi — ajans sadece bunları görecek.
              </span>
            </div>
          </section>

          {/* Erişim formu */}
          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ajansa Erişim Ver
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Link2 className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Oluşturulacak özel erişim bağlantısı</p>
                <p className="truncate font-mono text-xs font-medium">{link || "…"}</p>
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={copyLink} disabled={!link} title="Kopyala">
                {copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </section>

          {/* Mevcut erişimler */}
          {existing.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mevcut Ajans Erişimleri
              </p>
              <ul className="space-y-2">
                {existing.map((a) => {
                  const expired = isExpired(a);
                  return (
                    <li key={a.id} className="flex items-center gap-3 rounded-xl border p-3">
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
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleRenew(a.id)}>
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
            </section>
          )}

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
        </div>

        {/* Footer (sabit) */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
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
