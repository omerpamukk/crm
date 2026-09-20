"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Check,
  Trash2,
  Link2,
  Pencil,
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
  updateAgencyAccess,
  deleteAgencyAccess,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("180");
  const [permission, setPermission] = useState("view");
  const [note, setNote] = useState("");
  const [token, setToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      if (!token) setToken(genToken());
      if (typeof window !== "undefined") setOrigin(window.location.origin);
    }
  }

  const allSelected = selected.size === ALL_KEYS.length;
  const isEditing = editingId !== null;
  const durationOptions = isEditing
    ? [{ value: "keep", label: "Mevcut süreyi koru" }, ...AGENCY_DURATIONS]
    : [...AGENCY_DURATIONS];

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setNote("");
    setSelected(new Set(ALL_KEYS));
    setPermission("view");
    setDays("180");
    setToken(genToken());
    setError(null);
  }

  function startEdit(a: AgencyAccess) {
    setEditingId(a.id);
    setName(a.name);
    setEmail(a.email ?? "");
    setNote(a.note ?? "");
    setSelected(new Set(a.sections));
    setPermission(a.permission);
    setDays("keep");
    setToken(a.token);
    setError(null);
  }

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

  async function copyText(text: string, id: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Bağlantı kopyalandı");
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = isEditing
      ? await updateAgencyAccess(editingId, {
          name,
          email,
          sections: [...selected],
          permission,
          note,
          days: days === "keep" ? undefined : Number(days),
          keepDuration: days === "keep",
        })
      : await createAgencyAccess({
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
    toast.success(isEditing ? "Ajans erişimi güncellendi" : "Ajans paneli oluşturuldu");
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const r = await deleteAgencyAccess(id);
    setConfirmDeleteId(null);
    if (r.error) toast.error(r.error);
    else {
      toast.success("Ajans erişimi silindi");
      if (editingId === id) resetForm();
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:opacity-90">
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
            <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
              {isEditing ? <Pencil className="size-5" /> : <Store className="size-5" />}
            </span>
            <div>
              <DialogTitle className="text-lg">
                {isEditing ? "Ajans Erişimini Düzenle" : "Ajans Paneli Oluştur"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Bu ajansın görebileceği bölümleri ve ayarlarını güncelleyin."
                  : "Ajansa hangi bölümleri göstereceğinizi seçin, ardından erişim verin."}
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
                      "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
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
              {isEditing ? "Erişim Ayarları" : "Ajansa Erişim Ver"}
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
                    {durationOptions.map((d) => (
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

            {!isEditing && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="size-3.5" />
                Erişim bağlantısı oluşturduktan sonra aşağıdaki listede, ajansın yanındaki bağlantı butonundan kopyalanır.
              </p>
            )}
          </section>

          {/* Mevcut erişimler */}
          {existing.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mevcut Ajans Erişimleri ({existing.length})
              </p>
              <ul className="space-y-2">
                {existing.map((a) => {
                  const expired = isExpired(a);
                  const rowLink = origin ? `${origin}/ajans/${a.token}` : "";
                  return (
                    <li
                      key={a.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2.5 rounded-lg border p-3",
                        editingId === a.id && "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/15"
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                        {a.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.email ?? "—"} · {agencyPermissionLabel(a.permission)} · {a.sections.length} bölüm · {remainingText(a)}
                        </p>
                      </div>
                      {confirmDeleteId === a.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-danger">Kalıcı silinsin mi?</span>
                          <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(a.id)}>
                            Sil
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
                            Vazgeç
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge variant={expired ? "secondary" : "positive"}>
                            {expired ? "Pasif" : "Aktif"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="icon-sm" onClick={() => copyText(rowLink, a.id)} disabled={!rowLink} title="Bağlantıyı kopyala">
                              {copiedId === a.id ? <Check className="size-4 text-positive" /> : <Link2 className="size-4" />}
                            </Button>
                            <Button type="button" variant="outline" size="icon-sm" onClick={() => startEdit(a)} title="Düzenle">
                              <Pencil className="size-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon-sm" onClick={() => setConfirmDeleteId(a.id)} title="Kalıcı sil">
                              <Trash2 className="size-4 text-danger" />
                            </Button>
                          </div>
                        </>
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
        <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted/30 px-6 py-4">
          <span className="text-xs text-muted-foreground">
            {isEditing ? "Bir ajans erişimini düzenliyorsunuz" : `${existing.length} aktif/pasif erişim`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => (isEditing ? resetForm() : setOpen(false))}>
              {isEditing ? "Vazgeç" : "İptal"}
            </Button>
            <Button
              className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {isEditing ? <Pencil className="size-4" /> : <Store className="size-4" />}
              {submitting
                ? "Kaydediliyor..."
                : isEditing
                  ? "Değişiklikleri Kaydet"
                  : "Paneli Oluştur & Erişim Ver"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
