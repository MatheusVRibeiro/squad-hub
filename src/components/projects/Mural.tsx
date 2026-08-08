import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { addLocalMuralMessage, type MuralMessage } from "@/services/projectDetail";
import { notificationsIntegration } from "@/services/notificationsIntegration";

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

export function Mural({
  initial,
  projectId,
  projectName,
  readOnly,
}: {
  initial: MuralMessage[];
  projectId: string;
  projectName: string;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MuralMessage[]>(initial);
  const [draft, setDraft] = useState("");

  async function send() {
    if (!draft.trim()) return;
    const authorName = user?.name || "Você";
    const content = draft.trim();

    try {
      // 1. Persiste a mensagem via serviço (lança Error em falha)
      const newMessage = await addLocalMuralMessage(projectId, authorName, content);

      setMessages((m) => [...m, newMessage]);
      setDraft("");

      // 2. Dispara notificação integrada
      notificationsIntegration.notifyMuralMessage(projectName, authorName, content, projectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3.5">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 rounded-2xl border border-border/50 bg-card/65 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md"
          >
            <Avatar className="h-10 w-10 border shadow-inner">
              <AvatarFallback className="bg-gradient-to-tr from-primary/10 to-primary/20 text-primary text-xs font-semibold">
                {initials(m.author)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground/90">{m.author}</p>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {fromNow(m.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                {m.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {!readOnly ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Compartilhe uma atualização com o squad..."
            className="min-h-[90px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Ctrl + Enter para enviar
            </span>
            <Button
              size="sm"
              onClick={send}
              disabled={!draft.trim()}
              className="rounded-xl px-4 text-xs font-medium"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Publicar
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-8 text-center text-sm text-muted-foreground">
          🔒 Apenas membros do squad podem publicar atualizações no mural deste projeto.
        </div>
      )}
    </div>
  );
}
