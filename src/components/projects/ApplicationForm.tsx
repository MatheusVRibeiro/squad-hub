import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { candidatarComVaga } from "@/services/candidaturas";
import { notificationsIntegration } from "@/services/notificationsIntegration";
import { cn } from "@/lib/utils";
import type { Vaga } from "@/services/vagas";

const AVAILABILITY_OPTIONS = ["5h/sem", "10h/sem", "15h/sem", "20h+/sem"] as const;

/**
 * Formulário de candidatura ao squad (extraído de src/routes/projetos.$id.tsx
 * na refatoração UI/UX — ETAPA 1).
 */
export function ApplicationForm({
  projectId,
  projectName,
  vagas,
  onSubmitted,
}: {
  projectId: string;
  projectName: string;
  /** Vagas abertas do projeto (ETAPA 4) — select opcional de vaga na candidatura. */
  vagas: Vaga[];
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [disponibilidade, setDisponibilidade] = useState<string>("10h/sem");
  const [vagaId, setVagaId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Somente vagas abertas com posição disponível aparecem no select
  const vagasDisponiveis = vagas.filter(
    (v) => v.status === "aberta" && v.preenchidas < v.quantidade,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Por favor, digite uma mensagem de apresentação.");
      return;
    }
    setSubmitting(true);
    try {
      // mensagem enviada limpa conforme contrato dos testes
      const finalMessage = message.trim();

      // ETAPA 5: candidatura direcionada por vaga — vaga_id opcional, mensagem obrigatória.
      await candidatarComVaga(projectId, {
        vaga_id: vagaId ? Number(vagaId) : null,
        mensagem: finalMessage,
      });
      // Notifica
      notificationsIntegration.notifyApplied(projectName, user?.name || "Usuário", projectId);
      toast.success("Sua candidatura foi enviada com sucesso!");
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar candidatura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {vagasDisponiveis.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="app-vaga">Vaga desejada (opcional)</Label>
          <Select value={vagaId} onValueChange={setVagaId}>
            <SelectTrigger id="app-vaga" className="w-full cursor-pointer">
              <SelectValue placeholder="Selecione uma vaga do projeto" />
            </SelectTrigger>
            <SelectContent>
              {vagasDisponiveis.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.funcao_nome} ({v.preenchidas}/{v.quantidade})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Disponibilidade Semanal */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
            Disponibilidade Semanal
          </Label>
          <span className="text-xs font-medium text-muted-foreground">{disponibilidade}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const isSelected = disponibilidade === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setDisponibilidade(opt)}
                className={cn(
                  "h-8 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center cursor-pointer",
                  isSelected
                    ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                    : "bg-background/40 border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="app-message">Mensagem de Apresentação</Label>
          <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
        </div>
        <Textarea
          id="app-message"
          placeholder="Ex: Tenho interesse em atuar no desenvolvimento das tarefas e reuniões semanais..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={4}
          className="rounded-xl resize-none text-xs leading-relaxed"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting} className="rounded-xl cursor-pointer">
          {submitting ? "Enviando..." : "Enviar Candidatura"}
        </Button>
      </div>
    </form>
  );
}
