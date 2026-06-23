"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  CalendarDays,
  Package,
  Tag,
  Cake,
  MessageCircle,
  Calendar,
  FileText,
  ArrowRightLeft,
  Send,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
  customerStatusLabel,
  customerStatusVariant,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Customer, Interaction, InteractionType } from "@/types/database";
import { toast } from "sonner";

import { addCustomerNote } from "./interaction-actions";

type ApptRow = {
  id: string;
  starts_at: string;
  status: string | null;
  service: { name: string } | null;
};
type PkgRow = {
  id: string;
  service_name: string | null;
  remaining_sessions: number | null;
  total_sessions: number | null;
  purchased_at: string | null;
  price: number | null;
};

const INTERACTION_ICON: Record<
  InteractionType,
  React.ComponentType<{ className?: string }>
> = {
  mesaj: MessageCircle,
  arama: Phone,
  randevu_olusturuldu: Calendar,
  randevu_tamamlandi: Calendar,
  not: FileText,
  asama_degisikligi: ArrowRightLeft,
};

const INTERACTION_LABEL: Record<InteractionType, string> = {
  mesaj: "Mesaj",
  arama: "Arama",
  randevu_olusturuldu: "Randevu oluşturuldu",
  randevu_tamamlandi: "Randevu tamamlandı",
  not: "Not",
  asama_degisikligi: "Aşama değişikliği",
};

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function loadInteractions() {
    const supabase = createClient();
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });
    setInteractions((data ?? []) as Interaction[]);
  }

  useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createClient();

    (async () => {
      setLoading(true);
      const [apptRes, pkgRes, intRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, starts_at, status, service:services(name)")
          .eq("customer_id", customer.id)
          .order("starts_at", { ascending: false }),
        supabase
          .from("packages")
          .select(
            "id, service_name, remaining_sessions, total_sessions, purchased_at, price"
          )
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("interactions")
          .select("*")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setAppts((apptRes.data ?? []) as unknown as ApptRow[]);
      setPackages((pkgRes.data ?? []) as unknown as PkgRow[]);
      setInteractions((intRes.data ?? []) as Interaction[]);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [open, customer.id]);

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    setSavingNote(true);
    const res = await addCustomerNote(customer.id, text);
    setSavingNote(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setNoteText("");
    toast.success("Not eklendi");
    loadInteractions();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {customer.full_name}
            <Badge variant={customerStatusVariant(customer.status)}>
              {customerStatusLabel(customer.status)}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6">
          <Tabs defaultValue="genel">
            <TabsList className="w-full">
              <TabsTrigger value="genel" className="flex-1">
                Genel
              </TabsTrigger>
              <TabsTrigger value="zaman" className="flex-1">
                Zaman Çizelgesi
              </TabsTrigger>
            </TabsList>

            {/* GENEL */}
            <TabsContent value="genel" className="mt-4 space-y-6">
              <div className="space-y-2 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    {customer.email}
                  </div>
                )}
                {customer.birthday && (
                  <div className="flex items-center gap-2">
                    <Cake className="size-4 text-muted-foreground" />
                    {formatDate(customer.birthday)}
                  </div>
                )}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {customer.note && (
                  <p className="rounded-md bg-muted/50 p-2 text-muted-foreground">
                    {customer.note}
                  </p>
                )}
              </div>

              <Separator />

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="size-4 text-primary" />
                  Randevular
                </h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                ) : appts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu kişiye ait randevu yok.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {appts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {formatDateTime(a.starts_at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.service?.name ?? "Hizmet belirtilmedi"}
                          </p>
                        </div>
                        <Badge variant={appointmentStatusVariant(a.status)}>
                          {appointmentStatusLabel(a.status)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Package className="size-4 text-primary" />
                  Paketler
                </h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                ) : packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu kişiye ait paket yok.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {packages.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {p.service_name ?? "Paket"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.remaining_sessions ?? "—"} /{" "}
                            {p.total_sessions ?? "—"} seans ·{" "}
                            {formatDate(p.purchased_at)}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          {formatPrice(p.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            {/* ZAMAN ÇİZELGESİ */}
            <TabsContent value="zaman" className="mt-4 space-y-4">
              {/* Not ekle */}
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Bir not ekle..."
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={savingNote || !noteText.trim()}
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  {savingNote ? "Ekleniyor..." : "Not ekle"}
                </Button>
              </div>

              <Separator />

              {loading ? (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              ) : interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Henüz etkileşim kaydı yok.
                </p>
              ) : (
                <ul className="space-y-3">
                  {interactions.map((it) => {
                    const Icon = INTERACTION_ICON[it.type] ?? FileText;
                    return (
                      <li key={it.id} className="flex gap-3">
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm">
                            {it.note ?? INTERACTION_LABEL[it.type]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {INTERACTION_LABEL[it.type]} ·{" "}
                            {formatDateTime(it.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
