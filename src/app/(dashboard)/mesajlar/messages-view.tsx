"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  MessageCircle,
  MessagesSquare,
  Music,
  Mail,
  Send,
  Paperclip,
  Smile,
  Search,
  UserPlus,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Channel, DemoConversation, DemoMessage } from "./demo-data";

type ChannelTheme = {
  label: string;
  icon: LucideIcon;
  /** Sohbet listesi avatar karesi */
  avatar: string;
  /** Sağ panel başlık şeridi */
  header: string;
  /** Mesaj alanı arka planı */
  chat: string;
  incoming: string;
  outgoing: string;
  /** Alt yazma şeridi + gönder butonu */
  footer: string;
  input: string;
  send: string;
  placeholder: string;
};

const CHANNEL_THEME: Record<Channel, ChannelTheme> = {
  instagram: {
    label: "Instagram",
    icon: Camera,
    avatar: "bg-pink-100 text-[#d62976]",
    header: "bg-card text-foreground border-b",
    chat: "bg-muted/20",
    incoming: "bg-card border text-foreground",
    outgoing: "bg-primary text-primary-foreground",
    footer: "bg-card border-t",
    input: "bg-background",
    send: "bg-primary text-primary-foreground hover:bg-primary/90",
    placeholder: "Instagram mesajı yaz…",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    avatar: "bg-green-100 text-[#25D366]",
    header: "bg-[#075E54] text-white",
    chat: "bg-[#E5DDD5]",
    incoming: "bg-white text-zinc-900",
    outgoing: "bg-[#DCF8C6] text-zinc-900",
    footer: "bg-[#F0F0F0] border-t",
    input: "bg-white",
    send: "bg-[#25D366] text-white hover:bg-[#1ebe5d]",
    placeholder: "Mesaj yaz…",
  },
  messenger: {
    label: "Messenger",
    icon: MessagesSquare,
    avatar: "bg-blue-100 text-[#0084FF]",
    header: "bg-[#0084FF] text-white",
    chat: "bg-card",
    incoming: "bg-muted text-foreground",
    outgoing: "bg-[#0084FF] text-white",
    footer: "bg-card border-t",
    input: "bg-background",
    send: "bg-[#0084FF] text-white hover:bg-[#0073e0]",
    placeholder: "Messenger mesajı yaz…",
  },
  tiktok: {
    label: "TikTok",
    icon: Music,
    avatar: "bg-zinc-900 text-white",
    header: "bg-black text-white",
    chat: "bg-black",
    incoming: "bg-zinc-800 text-white",
    outgoing: "bg-[#FE2C55] text-white",
    footer: "bg-black border-t border-zinc-800",
    input: "bg-zinc-900 text-white placeholder:text-zinc-500 border-zinc-700",
    send: "bg-[#FE2C55] text-white hover:bg-[#e0274c]",
    placeholder: "TikTok mesajı yaz…",
  },
  email: {
    label: "E-posta",
    icon: Mail,
    avatar: "bg-muted text-muted-foreground",
    header: "bg-card text-foreground border-b",
    chat: "bg-muted/20",
    incoming: "bg-card border text-foreground",
    outgoing: "bg-primary text-primary-foreground",
    footer: "bg-card border-t",
    input: "bg-background",
    send: "bg-primary text-primary-foreground hover:bg-primary/90",
    placeholder: "E-posta yanıtı yaz…",
  },
};

const FILTERS: { key: "all" | Channel; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "instagram", label: "Instagram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "messenger", label: "Messenger" },
  { key: "tiktok", label: "TikTok" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function MessagesView({
  conversations,
  initialChannel,
}: {
  conversations: DemoConversation[];
  initialChannel: "all" | Channel;
}) {
  const [filter, setFilter] = useState<"all" | Channel>(initialChannel);
  const [threads, setThreads] = useState<Record<string, DemoMessage[]>>(() =>
    Object.fromEntries(conversations.map((c) => [c.id, c.messages]))
  );
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");

  const filtered = useMemo(
    () => conversations.filter((c) => filter === "all" || c.channel === filter),
    [conversations, filter]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    () => filtered[0]?.id ?? null
  );
  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const isUnread = (c: DemoConversation) => c.unread && !readIds.has(c.id);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: 0, instagram: 0, whatsapp: 0, messenger: 0, tiktok: 0, email: 0 };
    for (const c of conversations) {
      if (c.unread && !readIds.has(c.id)) {
        m[c.channel] += 1;
        m.all += 1;
      }
    }
    return m;
  }, [conversations, readIds]);

  function openConversation(id: string) {
    setSelectedId(id);
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function send() {
    const text = draft.trim();
    if (!text || !selected) return;
    const msg: DemoMessage = {
      id: `m-${new Date().getTime()}`,
      from: "me",
      text,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    setThreads((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), msg] }));
    setDraft("");
  }

  const theme = selected ? CHANNEL_THEME[selected.channel] : CHANNEL_THEME.instagram;
  const messages = selected ? threads[selected.id] ?? [] : [];

  return (
    <div className="flex h-[calc(100svh-7rem)] min-h-[560px] flex-col gap-4">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tüm Mesajlar</h1>
          <p className="text-sm text-muted-foreground">
            Instagram, WhatsApp, Messenger ve TikTok mesajların tek gelen kutusunda.
          </p>
        </div>
        <Button onClick={() => toast.info("Yeni mesaj oluşturma yakında (entegrasyon).")}>
          <Send className="size-4" />
          Yeni Mesaj
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        {/* Sol: kanal filtreleri + sohbet listesi */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs max-md:max-h-72 md:w-80">
          <div className="border-b p-3">
            <div className="mb-2 flex items-center gap-2">
              <Inbox className="size-4 text-primary" />
              <span className="text-sm font-semibold">Gelen Kutusu</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                const n = counts[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {f.label}
                    {n > 0 && (
                      <span
                        className={cn(
                          "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                          active ? "bg-primary-foreground/20" : "bg-danger text-white"
                        )}
                      >
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="flex-1 divide-y overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Bu kanalda mesaj yok.
              </li>
            ) : (
              filtered.map((c) => {
                const ct = CHANNEL_THEME[c.channel];
                const ChIcon = ct.icon;
                const unread = isUnread(c);
                const active = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        active ? "bg-primary/5" : "hover:bg-muted/40"
                      )}
                    >
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", ct.avatar)}>
                        <ChIcon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
                            {c.handle ?? c.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-xs", unread ? "text-foreground" : "text-muted-foreground")}>
                            {c.preview}
                          </span>
                          {unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Sağ: sohbet */}
        {selected ? (
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
            {/* Başlık şeridi */}
            <div className={cn("flex items-center justify-between gap-3 px-4 py-3", theme.header)}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", theme.avatar)}>
                  {initials(selected.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {selected.handle ?? selected.name}
                  </p>
                  <p className={cn("truncate text-xs", selected.channel === "tiktok" || selected.channel === "whatsapp" || selected.channel === "messenger" ? "text-white/70" : "text-muted-foreground")}>
                    {theme.label}
                    {selected.meta ? ` · ${selected.meta}` : ""}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toast.success(`${selected.name} potansiyel müşterilere eklendi (demo).`)}
                className="shrink-0"
              >
                <UserPlus className="size-4" />
                <span className="hidden sm:inline">Potansiyele Ekle</span>
              </Button>
            </div>

            {/* Mesajlar */}
            <div className={cn("flex-1 space-y-2 overflow-y-auto p-4", theme.chat)}>
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-xs",
                      m.from === "me" ? theme.outgoing : theme.incoming
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                    <p className={cn("mt-1 text-right text-[10px]", m.from === "me" ? "opacity-70" : "opacity-50")}>
                      {m.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Yazma şeridi */}
            <div className={cn("flex items-center gap-2 p-3", theme.footer)}>
              <button
                type="button"
                onClick={() => toast.info("Dosya ekleme yakında.")}
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors", selected.channel === "tiktok" ? "text-zinc-400 hover:bg-zinc-800" : "text-muted-foreground hover:bg-muted")}
              >
                {selected.channel === "instagram" || selected.channel === "messenger" || selected.channel === "tiktok" ? (
                  <Smile className="size-5" />
                ) : (
                  <Paperclip className="size-5" />
                )}
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={theme.placeholder}
                className={cn(
                  "h-10 flex-1 rounded-full border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  theme.input
                )}
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim()}
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                  theme.send
                )}
              >
                <Send className="size-4" />
              </button>
            </div>
          </section>
        ) : (
          <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center shadow-xs">
            <Search className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Görüntülenecek mesaj seç.</p>
          </section>
        )}
      </div>
    </div>
  );
}
