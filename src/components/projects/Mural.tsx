import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import type { MuralMessage } from "@/services/projectDetail";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fromNow(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "agora";
  if (d < 3600) return `${Math.floor(d / 60)} min atrás`;
  if (d < 86400) return `${Math.floor(d / 3600)} h atrás`;
  return `${Math.floor(d / 86400)} d atrás`;
}

export function Mural({ initial }: { initial: MuralMessage[] }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MuralMessage[]>(initial);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    setMessages((m) => [
      ...m,
      {
        id: `local-${Date.now()}`,
        author: user?.name ?? "Você",
        content: draft.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 rounded-2xl border bg-card p-3"
          >
            <Avatar className="h-9 w-9 border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials(m.author)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{m.author}</p>
                <span className="text-[11px] text-muted-foreground">{fromNow(m.createdAt)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                {m.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Compartilhe uma atualização com o squad..."
          className="min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter para enviar</span>
          <Button size="sm" onClick={send} disabled={!draft.trim()} className="rounded-xl">
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Publicar
          </Button>
        </div>
      </div>
    </div>
  );
}