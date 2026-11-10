"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MessageCircle, MessageSquareText, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions, FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { StatusBadge } from "@/components/shared/status";

import { disconnectIntegration, saveIntegration, testIntegration } from "./actions";
import type { Provider } from "./schema";
import type { SettingsData } from "./settings-view";

type Def = {
  provider: Provider;
  name: string;
  hint: string;
  icon: LucideIcon;
  fields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
  testPlaceholder: string;
};

/** Bağlanabilen mesaj kanalları ve istedikleri bilgiler. */
const CONNECTABLE: Def[] = [
  {
    provider: "sms",
    name: "SMS",
    hint: "Randevu hatırlatması ve toplu SMS için",
    icon: MessageSquareText,
    fields: [
      { key: "usercode", label: "Kullanıcı kodu", placeholder: "850XXXXXXX" },
      { key: "password", label: "Şifre", secret: true },
      { key: "msgheader", label: "Mesaj başlığı", placeholder: "İŞLETMEADI" },
    ],
    testPlaceholder: "05xx xxx xx xx",
  },
  {
    provider: "smtp",
    name: "E-posta",
    hint: "Bilgilendirme ve duyuru e-postaları için",
    icon: Mail,
    fields: [
      { key: "api_key", label: "Gönderim anahtarı", placeholder: "re_...", secret: true },
      { key: "from", label: "Gönderen adresi", placeholder: "randevu@ornek.com" },
    ],
    testPlaceholder: "ornek@eposta.com",
  },
  {
    provider: "whatsapp",
    name: "WhatsApp",
    hint: "Müşterilere WhatsApp mesajı göndermek için",
    icon: MessageCircle,
    fields: [
      { key: "phone_number_id", label: "Telefon numarası kimliği", placeholder: "1234567890" },
      { key: "access_token", label: "Erişim anahtarı", secret: true },
    ],
    testPlaceholder: "05xx xxx xx xx",
  },
];

type Row = SettingsData["integrations"][number];

function statusOf(row: Row | undefined) {
  if (!row || row.status === "disconnected") return { variant: "neutral" as const, label: "Bağlı değil" };
  if (row.status === "error") return { variant: "danger" as const, label: "Sorun var" };
  return { variant: "positive" as const, label: "Bağlı" };
}

/** Bağlantılar: SMS, e-posta ve WhatsApp. Kayıtlı bilgiler asla ekrana geri getirilmez. */
export function IntegrationsSection({ rows }: { rows: SettingsData["integrations"] }) {
  const [editing, setEditing] = useState<Provider | null>(null);
  const [open, setOpen] = useState(false);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const def = CONNECTABLE.find((d) => d.provider === editing) ?? null;

  return (
    <div className="space-y-8">
      <ListGroup
        title="Mesaj gönderme"
        detail="Bilgiler güvenle saklanır, bu ekrana geri getirilmez."
        aria-label="Mesaj bağlantıları"
      >
        {CONNECTABLE.map((d) => {
          const row = byProvider.get(d.provider);
          const st = statusOf(row);
          const Icon = d.icon;
          return (
            <ListRow
              key={d.provider}
              leading={<Icon aria-hidden className="size-5 text-label-2" />}
              title={d.name}
              subtitle={row?.account_label || d.hint}
              trailing={<StatusBadge variant={st.variant}>{st.label}</StatusBadge>}
              chevron
              onClick={() => {
                setEditing(d.provider);
                setOpen(true);
              }}
              aria-label={`${d.name}: ${st.label}`}
            />
          );
        })}
      </ListGroup>

      <ListGroup title="Yakında" aria-label="Yakında gelecek bağlantılar">
        <ListRow title="Instagram" subtitle="Hesap onayı bekleniyor" trailing={<span className="text-subhead text-label-2">Yakında</span>} />
        <ListRow title="TikTok" subtitle="Hesap onayı bekleniyor" trailing={<span className="text-subhead text-label-2">Yakında</span>} />
        <ListRow title="Google İşletme Profili" subtitle="Yorumlar için" trailing={<span className="text-subhead text-label-2">Yakında</span>} />
      </ListGroup>

      <FormSheet
        open={open && Boolean(def)}
        onOpenChange={setOpen}
        title={def ? `${def.name} bağlantısı` : "Bağlantı"}
        description="Bilgileri sağlayıcınızın hesap panelinde bulabilirsiniz."
      >
        {def && (
          <IntegrationForm
            key={def.provider}
            def={def}
            row={byProvider.get(def.provider)}
            onClose={() => setOpen(false)}
          />
        )}
      </FormSheet>
    </div>
  );
}

function IntegrationForm({ def, row, onClose }: { def: Def; row: Row | undefined; onClose: () => void }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        account_label: z.string().optional(),
        credentials: z.object(
          Object.fromEntries(def.fields.map((f) => [f.key, z.string().trim().min(1, "Bu alan boş bırakılamaz")]))
        ),
      }),
    [def.fields]
  );
  type Values = { account_label?: string; credentials: Record<string, string> };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      account_label: row?.account_label ?? "",
      credentials: Object.fromEntries(def.fields.map((f) => [f.key, ""])),
    },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    const res = await saveIntegration({
      provider: def.provider,
      account_label: values.account_label,
      credentials: values.credentials,
    });
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success(`${def.name} bağlantısı kaydedildi`);
    onClose();
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await disconnectIntegration(def.provider);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${def.name} bağlantısı kaldırıldı`);
    setConfirmRemove(false);
    onClose();
    router.refresh();
  }

  async function sendTest() {
    setTesting(true);
    const res = await testIntegration(def.provider, testTo);
    setTesting(false);
    if (res.error) toast.error(res.error);
    else toast.success("Deneme mesajı gönderildi");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {row?.status === "error" && (
        <p role="alert" className="surface-flat px-4 py-3 text-[0.9375rem] text-danger-text">
          Son denemede bağlantı kurulamadı. Bilgileri kontrol edip yeniden kaydedin.
        </p>
      )}
      {row && (
        <p className="text-subhead text-label-2">
          Kayıtlı bilgiler gösterilmez. Değiştirmek için tüm alanları yeniden girin.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {def.fields.map((f) => {
          const err = (errors.credentials as Record<string, { message?: string }> | undefined)?.[f.key];
          return (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={`cred-${f.key}`}>{f.label} *</Label>
              <Input
                id={`cred-${f.key}`}
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                placeholder={f.placeholder}
                aria-invalid={!!err}
                {...register(`credentials.${f.key}`)}
              />
              {err?.message && <p className="text-subhead text-danger-text">{err.message}</p>}
            </div>
          );
        })}
        <div className="space-y-2">
          <Label htmlFor="account_label">Görünen ad</Label>
          <Input id="account_label" placeholder={def.name} {...register("account_label")} />
        </div>

        {formError && (
          <p role="alert" className="text-subhead text-danger-text">
            {formError}
          </p>
        )}

        <FormActions
          start={
            row && (
              <Button type="button" variant="destructive" onClick={() => setConfirmRemove(true)}>
                Bağlantıyı kaldır
              </Button>
            )
          }
        >
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </FormActions>
      </form>

      {row && (
        <div className="space-y-2 border-t border-separator pt-4">
          <Label htmlFor="test-to">Bağlantıyı dene</Label>
          <div className="flex gap-2">
            <Input
              id="test-to"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={def.testPlaceholder}
              className="min-w-0 flex-1"
            />
            <Button type="button" variant="secondary" disabled={testing || !testTo.trim()} onClick={sendTest}>
              {testing ? "Gönderiliyor..." : "Deneme gönder"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bağlantıyı kaldır</DialogTitle>
            <DialogDescription>
              {def.name} bağlantısı kaldırılacak ve kayıtlı bilgiler silinecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
              Vazgeç
            </Button>
            <Button variant="destructive-solid" onClick={remove} disabled={busy}>
              {busy ? "Kaldırılıyor..." : "Bağlantıyı kaldır"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
