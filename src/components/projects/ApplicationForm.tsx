import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Vaga } from "@/services/vagas";

/**
 * Formulário de candidatura ao squad (extraído de src/routes/projetos.$id.tsx
 * na refatoração UI/UX — ETAPA 1). Lógica idêntica à original.
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
  const [skills, setSkills] = useState(user?.skills?.join(", ") || "");
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
      // ETAPA 5: candidatura direcionada por vaga — vaga_id opcional, mensagem obrigatória.
      await candidatarComVaga(projectId, {
        vaga_id: vagaId ? Number(vagaId) : null,
        mensagem: message.trim(),
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
      <div className="space-y-2">
        <Label htmlFor="app-message">Mensagem de Apresentação</Label>
        <Textarea
          id="app-message"
          placeholder="Ex: Tenho interesse em ajudar com a API rest e banco de dados..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="app-skills">Suas Habilidades (separadas por vírgula)</Label>
        <Input
          id="app-skills"
          placeholder="React, Node.js, TypeScript"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting} className="rounded-xl">
          {submitting ? "Enviando..." : "Enviar Candidatura"}
        </Button>
      </div>
    </form>
  );
}
