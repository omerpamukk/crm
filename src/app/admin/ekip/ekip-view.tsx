"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, UserPlus, ShieldCheck, KeyRound, Trash2, Copy, CheckCircle2, SlidersHorizontal, Crown, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_PERMS, DEFAULT_ADMIN_PERMS, PERM_LABEL } from "@/lib/admin-perms";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { addAdmin, updateAdminPerms, resetAdminPassword, removeAdmin } from "./actions";

export type AdminRow = { user_id: string; full_name: string | null; is_owner: boolean; permissions: string[]; email: string; phone: string | null; isSelf: boolean };

export function EkipView({ rows }: { rows: AdminRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [nu, setNu] = useState({ fullName: "", email: "", phone: "", password: "", pwMode: "auto", perms: [...DEFAULT_ADMIN_PERMS] as string[] });
  const [permEdit, setPermEdit] = useState<AdminRow | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [creds, setCreds] = useState<{ email?: string; password: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminRow | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; credentials?: { email: string; password: string }; password?: string }>, okMsg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error ?? "Hata oluştu."); return; }
      if (res.credentials) setCreds(res.credentials);
      else if (res.password) setCreds({ password: res.password });
      else toast.success(okMsg);
      router.refresh();
    });

  const copy = (t: string, l: string) => { navigator.clipboard.writeText(t); toast.success(`${l} kopyalandı`); };
  const toggle = (list: string[], k: string) => list.includes(k) ? list.filter((x) => x !== k) : [...list, k];

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Firmalar</Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ekip & Yöneticiler</h1>
          <p className="text-sm text-muted-foreground">Ajansına yönetici/ekip üyesi ekle ve yetkilerini belirle. Yeni adminler varsayılan olarak kısıtlıdır.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><UserPlus className="size-4" />Admin Ekle</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" />Yöneticiler ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {rows.map((a) => (
              <li key={a.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", a.is_owner ? "bg-gradient-to-br from-primary to-violet-500 text-white" : "bg-primary/10 text-primary")}>
                  {(a.full_name ?? a.email).slice(0, 2).toLocaleUpperCase("tr")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {a.full_name ?? "—"}
                    {a.is_owner && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-primary to-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white"><Crown className="size-2.5" />Kurucu</span>}
                    {a.isSelf && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Sen</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                  {!a.is_owner && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.permissions.length === 0 ? <span className="text-[11px] text-muted-foreground">Yetki yok (yalnızca panel görür)</span> :
                        a.permissions.map((p) => <span key={p} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{PERM_LABEL[p] ?? p}</span>)}
                    </div>
                  )}
                </div>
                {a.is_owner ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-positive/12 px-2 py-1 text-xs font-medium text-positive"><ShieldCheck className="size-3.5" />Tam yetki</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => { setPermEdit(a); setEditPerms([...a.permissions]); }}><SlidersHorizontal className="size-3.5" />Yetkiler</Button>
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => resetAdminPassword(a.user_id), "Şifre sıfırlandı")}><KeyRound className="size-3.5" />Şifre</Button>
                    <Button variant="outline" size="icon-sm" className="text-danger" disabled={pending || a.isSelf} onClick={() => setConfirmDel(a)}><Trash2 className="size-3.5" /></Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Kurucu yöneticiler (elle eklenen) düzenlenemez/silinemez. Ek adminler kurucu/ekip üzerinde işlem yapamaz; yalnızca kendilerine verilen yetkileri kullanır.</p>

      {/* Admin ekle */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Admin / Ekip Üyesi Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Fld label="Ad Soyad" value={nu.fullName} onChange={(v) => setNu((p) => ({ ...p, fullName: v }))} />
            <Fld label="E-posta" type="email" value={nu.email} onChange={(v) => setNu((p) => ({ ...p, email: v }))} />
            <Fld label="Telefon (opsiyonel)" value={nu.phone} onChange={(v) => setNu((p) => ({ ...p, phone: v }))} />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Şifre</label>
              <div className="flex gap-1 rounded-lg border p-0.5 text-xs">
                <button type="button" onClick={() => setNu((p) => ({ ...p, pwMode: "auto" }))} className={cn("flex-1 rounded-md py-1.5 font-medium", nu.pwMode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Otomatik üret</button>
                <button type="button" onClick={() => setNu((p) => ({ ...p, pwMode: "custom" }))} className={cn("flex-1 rounded-md py-1.5 font-medium", nu.pwMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Kendim belirle</button>
              </div>
              {nu.pwMode === "custom" && <input value={nu.password} onChange={(e) => setNu((p) => ({ ...p, password: e.target.value }))} placeholder="En az 8 karakter" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />}
            </div>
            <PermPicker perms={nu.perms} onToggle={(k) => setNu((p) => ({ ...p, perms: toggle(p.perms, k) }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>İptal</Button>
            <Button disabled={pending} onClick={() => { setAddOpen(false); run(() => addAdmin({ fullName: nu.fullName, email: nu.email, phone: nu.phone, perms: nu.perms, password: nu.pwMode === "custom" ? nu.password : undefined }), "Admin eklendi"); setNu({ fullName: "", email: "", phone: "", password: "", pwMode: "auto", perms: [...DEFAULT_ADMIN_PERMS] }); }}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yetki düzenle */}
      <Dialog open={!!permEdit} onOpenChange={(o) => !o && setPermEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yetkiler — {permEdit?.full_name ?? permEdit?.email}</DialogTitle></DialogHeader>
          <PermPicker perms={editPerms} onToggle={(k) => setEditPerms((p) => toggle(p, k))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermEdit(null)}>İptal</Button>
            <Button disabled={pending} onClick={() => { const id = permEdit?.user_id; setPermEdit(null); if (id) run(() => updateAdminPerms(id, editPerms), "Yetkiler güncellendi"); }}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Üretilen kimlik bilgisi */}
      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-positive" />Giriş Bilgisi</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Bu bilgiyi ilgili kişiye iletin. Şifre yalnızca şimdi gösteriliyor.</p>
          <div className="space-y-2">
            {creds?.email && <Reveal label="E-posta" value={creds.email} onCopy={() => copy(creds.email!, "E-posta")} />}
            {creds && <Reveal label="Şifre" value={creds.password} onCopy={() => copy(creds.password, "Şifre")} />}
          </div>
          <DialogFooter><Button onClick={() => setCreds(null)}>Tamam</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sil onayı */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-danger" />Admini sil</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground"><b>{confirmDel?.full_name ?? confirmDel?.email}</b> admini kalıcı olarak silinecek (giriş yapamaz). Geri alınamaz.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>İptal</Button>
            <Button variant="destructive" disabled={pending} onClick={() => { const a = confirmDel; setConfirmDel(null); if (a) run(() => removeAdmin(a.user_id), "Admin silindi"); }}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PermPicker({ perms, onToggle }: { perms: string[]; onToggle: (k: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Yetkiler</label>
      <div className="space-y-1.5 rounded-lg border p-2">
        {ADMIN_PERMS.map((p) => (
          <label key={p.key} className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-muted/50">
            <input type="checkbox" checked={perms.includes(p.key)} onChange={() => onToggle(p.key)} className="mt-0.5 size-4 accent-primary" />
            <span><span className="block text-sm font-medium">{p.label}</span><span className="block text-xs text-muted-foreground">{p.desc}</span></span>
          </label>
        ))}
      </div>
    </div>
  );
}
function Fld({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}
function Reveal({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate font-mono text-sm">{value}</p></div>
      <Button variant="outline" size="icon-sm" onClick={onCopy}><Copy className="size-3.5" /></Button>
    </div>
  );
}
