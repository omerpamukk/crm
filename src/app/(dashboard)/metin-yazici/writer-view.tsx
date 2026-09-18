"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Send,
  RotateCcw,
  MessageSquareText,
  Hash,
  Megaphone,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InstagramLogo } from "../mesajlar/channel-icons";
import { generateCopy } from "./copywriter-actions";

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };

const TYPES: { label: string; tone: string }[] = [
  { label: "Caption", tone: "bg-pink-100 text-pink-700" },
  { label: "WhatsApp", tone: "bg-green-100 text-green-700" },
  { label: "E-posta", tone: "bg-blue-100 text-blue-700" },
  { label: "SMS", tone: "bg-amber-100 text-amber-700" },
  { label: "Reklam", tone: "bg-rose-100 text-rose-700" },
  { label: "Hashtag", tone: "bg-muted text-muted-foreground" },
  { label: "Blog", tone: "bg-emerald-100 text-emerald-700" },
];

const SUGGESTIONS: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Instagram caption yaz", icon: InstagramLogo },
  { label: "WhatsApp kampanya mesajı", icon: MessageSquareText },
  { label: "E-posta bülteni yaz", icon: FileText },
  { label: "SMS kampanyası", icon: MessageSquareText },
  { label: "Reklam metni oluştur", icon: Megaphone },
  { label: "Hashtag önerileri ver", icon: Hash },
  { label: "Blog yazısı başlığı", icon: FileText },
];

const WELCOME =
  "Merhaba!️ Ben senin AI metin asistanınım. Aşağıdaki önerilerden birini seçebilir ya da doğrudan yazabilirsin.\n\nÖrnek: \"Yaz indirimi için Instagram caption yaz, eğlenceli ve emojili olsun\" veya \"WhatsApp kampanya mesajı, profesyonel ton, kısa.\"";

export function WriterView() {
  const [messages, setMessages] = useState<ChatMsg[]>([{ id: "w", role: "assistant", text: WELCOME }]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function ask(text: string) {
    const clean = text.trim();
    if (!clean || pending) return;
    setMessages((prev) => [...prev, { id: `u-${new Date().getTime()}`, role: "user", text: clean }]);
    setDraft("");
    startTransition(async () => {
      const res = await generateCopy(clean);
      setMessages((prev) => [
        ...prev,
        { id: `a-${new Date().getTime()}`, role: "assistant", text: res.error ? res.error : res.text },
      ]);
    });
  }

  function reset() {
    setMessages([{ id: "w", role: "assistant", text: WELCOME }]);
    setDraft("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Sol: asistan kartı */}
      <div className="rounded-xl border bg-primary/[0.04] p-5 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
          <Sparkles className="size-8" />
        </div>
        <p className="mt-3 font-semibold">Yazar</p>
        <p className="text-xs text-muted-foreground">AI Metin Asistanı</p>

        <p className="mt-4 text-xs font-medium text-muted-foreground">Yazı türleri</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => ask(`${t.label} metni yaz`)}
              className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80", t.tone)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs">
          <span className="size-2 rounded-full bg-positive" />
          Hazır
        </div>
      </div>

      {/* Sağ: sohbet */}
      <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Metin Yazıcı — AI</p>
              <p className="text-xs text-muted-foreground">Ne yazmamı istersin? Söyle, hemen üreteyim.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-4" />
            Sıfırla
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-soft",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/[0.06] text-foreground"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-primary/[0.06] px-4 py-2.5 text-sm text-muted-foreground">Yazıyor…</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 border-t px-3 pt-3">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => ask(s.label)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Icon className="size-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            placeholder="Ne yazmamı istersin? (platform, konu, ton belirt...)"
            className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => ask(draft)}
            disabled={pending || !draft.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
