"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormActions, FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";

import { updateNotificationSettings } from "./actions";
import type { NotificationSettingInput, NotifKey, Provider } from "./schema";
import {
  CHANNELS,
  CHANNEL_LABEL,
  DIGEST_KEYS,
  HIDDEN_NOTIF_KEYS,
  NOTIF_LABEL,
  RECIPIENT_ROLES,
} from "./settings-meta";

/** Kanal → bağlantı sağlayıcısı (panel dışındaki kanallar bağlantı ister). */
const CHANNEL_PROVIDER: Record<string, Provider | undefined> = {
  sms: "sms",
  email: "smtp",
  whatsapp: "whatsapp",
};

function summary(n: NotificationSettingInput): string {
  if (!n.enabled) return "Kapalı";
  const ch = n.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ");
  return ch ? `Açık · ${ch}` : "Açık · kanal seçilmedi";
}

/** Bildirimler: her satır bir olay; ayrıntı panelde düzenlenir. */
export function NotificationsSection({
  items,
  connected,
}: {
  items: NotificationSettingInput[];
  /** Bağlı sağlayıcılar (SMS, e-posta, WhatsApp kanalı açmak için). */
  connected: Provider[];
}) {
  const router = useRouter();
  const [editKey, setEditKey] = useState<NotifKey | null>(null);
  const [open, setOpen] = useState(false);

  const events = items.filter((i) => !DIGEST_KEYS.includes(i.key) && !HIDDEN_NOTIF_KEYS.includes(i.key));
  const digests = items.filter((i) => DIGEST_KEYS.includes(i.key));
  const editing = items.find((i) => i.key === editKey) ?? null;

  function edit(key: NotifKey) {
    setEditKey(key);
    setOpen(true);
  }

  const row = (n: NotificationSettingInput) => (
    <ListRow
      key={n.key}
      title={NOTIF_LABEL[n.key].title}
      subtitle={n.key.endsWith("ozeti") && n.enabled && n.send_at ? `${summary(n)} · ${n.send_at}` : summary(n)}
      chevron
      onClick={() => edit(n.key)}
      aria-label={`${NOTIF_LABEL[n.key].title}: ${summary(n)}`}
    />
  );

  return (
    <div className="space-y-8">
      <p className="text-[0.9375rem] text-label-2">
        Panel bildirimleri hemen çalışır. SMS, e-posta ve WhatsApp için önce Bağlantılar bölümünden ilgili bağlantıyı kurun.
      </p>
      <ListGroup title="Olaylar" aria-label="Olay bildirimleri">
        {events.map(row)}
      </ListGroup>
      <ListGroup title="Özetler" aria-label="Özet bildirimleri">
        {digests.map(row)}
      </ListGroup>

      <FormSheet
        open={open && Boolean(editing)}
        onOpenChange={setOpen}
        title={editing ? NOTIF_LABEL[editing.key].title : "Bildirim"}
        description={editing ? NOTIF_LABEL[editing.key].desc : undefined}
      >
        {editing && (
          <NotificationForm
            key={editing.key}
            all={items}
            item={editing}
            connected={connected}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </FormSheet>
    </div>
  );
}

function NotificationForm({
  all,
  item,
  connected,
  onDone,
  onCancel,
}: {
  all: NotificationSettingInput[];
  item: NotificationSettingInput;
  connected: Provider[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const isDigest = DIGEST_KEYS.includes(item.key);
  const { handleSubmit, control, register, formState: { isSubmitting } } =
    useForm<NotificationSettingInput>({ defaultValues: item });
  const enabled = useWatch({ control, name: "enabled" });

  async function onSubmit(values: NotificationSettingInput) {
    setFormError(null);
    if (values.enabled && values.channels.length === 0) {
      setFormError("En az bir kanal seçin ya da bildirimi kapatın.");
      return;
    }
    if (values.enabled && values.recipient_roles.length === 0) {
      setFormError("Bildirimin kime gideceğini seçin.");
      return;
    }
    const next = all.map((n) => (n.key === item.key ? { ...values, send_at: isDigest ? values.send_at : null } : n));
    const res = await updateNotificationSettings({ items: next });
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success("Bildirim kaydedildi");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="surface-flat flex items-center justify-between gap-3 py-1 pr-1 pl-4">
        <p className="text-[0.9375rem] font-medium">Bildirim açık</p>
        <Controller
          control={control}
          name="enabled"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} label="Bildirim açık" />
          )}
        />
      </div>

      {enabled && (
        <>
          {isDigest && (
            <div className="space-y-2">
              <Label htmlFor="send_at">Gönderim saati</Label>
              <Input id="send_at" type="time" className="w-36" {...register("send_at")} />
            </div>
          )}

          <Controller
            control={control}
            name="channels"
            render={({ field }) => (
              <ListGroup title="Nereden bildirilsin?" inset={16}>
                {CHANNELS.map((c) => {
                  const provider = CHANNEL_PROVIDER[c.key];
                  const ready = !provider || connected.includes(provider);
                  const on = field.value.includes(c.key);
                  return (
                    <ListRow
                      key={c.key}
                      title={c.label}
                      subtitle={ready ? undefined : "Önce Bağlantılar bölümünden kurun"}
                      trailing={
                        <Switch
                          checked={on}
                          disabled={!ready && !on}
                          label={`${c.label} ile bildir`}
                          onCheckedChange={(v) =>
                            field.onChange(v ? [...field.value, c.key] : field.value.filter((x) => x !== c.key))
                          }
                        />
                      }
                    />
                  );
                })}
              </ListGroup>
            )}
          />

          <Controller
            control={control}
            name="recipient_roles"
            render={({ field }) => (
              <ListGroup title="Kime gitsin?" inset={16}>
                {RECIPIENT_ROLES.map((r) => (
                  <ListRow
                    key={r.key}
                    title={r.label}
                    trailing={
                      <Switch
                        checked={field.value.includes(r.key)}
                        label={`${r.label} bildirimi alsın`}
                        onCheckedChange={(v) =>
                          field.onChange(v ? [...field.value, r.key] : field.value.filter((x) => x !== r.key))
                        }
                      />
                    }
                  />
                ))}
              </ListGroup>
            )}
          />
        </>
      )}

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </FormActions>
    </form>
  );
}
