import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFuncoes } from "@/services/perfilTecnico";
import {
  atualizarVaga,
  criarVaga,
  excluirVaga,
  type Funcao,
  type NivelDesejado,
  type Vaga,
  type VagaStatus,
} from "@/services/vagas";

/** Fallback offline das 9 funções (ETAPA 3/4) — a lista real vem de GET /funcoes. */
const FUNCOES_PADRAO: Funcao[] = [
  { id: 1, nome: "Backend" },
  { id: 2, nome: "Frontend" },
  { id: 3, nome: "Full Stack" },
  { id: 4, nome: "Mobile" },
  { id: 5, nome: "QA" },
  { id: 6, nome: "DevOps" },
  { id: 7, nome: "UX/UI" },
  { id: 8, nome: "Data" },
  { id: 9, nome: "Product" },
];

const NIVEIS: { value: NivelDesejado; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
  { value: "qualquer", label: "Qualquer nível" },
];

function nivelLabel(nivel: string): string {
  return NIVEIS.find((n) => n.value === nivel)?.label ?? "Qualquer nível";
}

function VagaFormModal({
  open,
  onOpenChange,
  vaga,
  funcoes,
  projectId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = criação; objeto = edição. */
  vaga: Vaga | null;
  funcoes: Funcao[];
  projectId: string;
  onSaved: (vaga: Vaga) => void;
}) {
  const [funcaoId, setFuncaoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [descricao, setDescricao] = useState("");
  const [nivel, setNivel] = useState<NivelDesejado>("qualquer");
  const [status, setStatus] = useState<VagaStatus>("aberta");
  const [submitting, setSubmitting] = useState(false);

  // Sincroniza o formulário ao abrir (criar = vazio, editar = dados da vaga)
  useEffect(() => {
    if (open) {
      setFuncaoId(vaga ? String(vaga.funcao_id) : "");
      setQuantidade(vaga ? String(vaga.quantidade) : "1");
      setDescricao(vaga?.descricao ?? "");
      setNivel(vaga?.nivel_desejado ?? "qualquer");
      setStatus(vaga?.status ?? "aberta");
    }
  }, [open, vaga]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const funcaoIdNum = Number(funcaoId);
    if (!funcaoIdNum) {
      toast.error("Selecione a função da vaga.");
      return;
    }
    const quantidadeNum = Number(quantidade);
    if (!Number.isInteger(quantidadeNum) || quantidadeNum <= 0) {
      toast.error("A quantidade deve ser um número inteiro maior que zero.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        funcao_id: funcaoIdNum,
        quantidade: quantidadeNum,
        descricao: descricao.trim() || null,
        nivel_desejado: nivel,
        status,
      };
      const saved = vaga
        ? await atualizarVaga(projectId, vaga.id, payload)
        : await criarVaga(projectId, payload);
      toast.success(vaga ? "Vaga atualizada com sucesso!" : "Vaga criada com sucesso!");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a vaga.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{vaga ? "Editar Vaga" : "Nova Vaga"}</DialogTitle>
          <DialogDescription>
            {vaga
              ? "Ajuste a função, a quantidade ou as preferências desta vaga."
              : "Defina qual perfil o projeto está procurando."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="vaga-funcao">Função</Label>
            <Select value={funcaoId} onValueChange={setFuncaoId}>
              <SelectTrigger id="vaga-funcao" className="w-full cursor-pointer">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {funcoes.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vaga-quantidade">Quantidade</Label>
              <Input
                id="vaga-quantidade"
                type="number"
                min={1}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaga-nivel">Nível desejado</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as NivelDesejado)}>
                <SelectTrigger id="vaga-nivel" className="w-full cursor-pointer">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaga-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as VagaStatus)}>
                <SelectTrigger id="vaga-status" className="w-full cursor-pointer">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vaga-descricao">Descrição (opcional)</Label>
            <Textarea
              id="vaga-descricao"
              placeholder="Ex: Buscamos alguém com experiência em Node.js para cuidar da API..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-xl">
              {submitting ? "Salvando..." : vaga ? "Salvar Alterações" : "Criar Vaga"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Vagas({
  initial,
  projectId,
  isOwner,
}: {
  initial: Vaga[];
  projectId: string;
  isOwner: boolean;
}) {
  const [vagas, setVagas] = useState<Vaga[]>(initial);
  const [funcoes, setFuncoes] = useState<Funcao[]>(FUNCOES_PADRAO);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vaga | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Funções reais vêm de GET /funcoes (ETAPA 3); em falha usa o fallback offline.
  useEffect(() => {
    getFuncoes()
      .then((list) => {
        if (list.length > 0) setFuncoes(list);
      })
      .catch(() => {
        // fallback offline FUNCOES_PADRAO
      });
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(vaga: Vaga) {
    setEditing(vaga);
    setModalOpen(true);
  }

  function handleSaved(vaga: Vaga) {
    setVagas((arr) => {
      const exists = arr.some((v) => v.id === vaga.id);
      return exists ? arr.map((v) => (v.id === vaga.id ? vaga : v)) : [...arr, vaga];
    });
  }

  async function handleDelete(vaga: Vaga) {
    if (!window.confirm(`Excluir a vaga de ${vaga.funcao_nome}? Esta ação não pode ser desfeita.`))
      return;

    setDeletingId(vaga.id);
    try {
      await excluirVaga(projectId, vaga.id);
      setVagas((arr) => arr.filter((v) => v.id !== vaga.id));
      toast.success("Vaga excluída com sucesso!");
    } catch (err) {
      // Ex.: backend retorna 409 "Vaga possui membros vinculados" → mensagem no toast
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a vaga.");
    } finally {
      setDeletingId(null);
    }
  }

  const vagasAbertas = vagas.filter((v) => v.status === "aberta").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground/90">
            {vagas.length === 0
              ? "Nenhuma vaga cadastrada"
              : `${vagasAbertas} vaga${vagasAbertas === 1 ? "" : "s"} aberta${vagasAbertas === 1 ? "" : "s"} de ${vagas.length}`}
          </h3>
          <p className="text-xs text-muted-foreground">Perfis que este projeto está procurando.</p>
        </div>
        {isOwner && (
          <Button
            size="sm"
            onClick={openCreate}
            className="rounded-xl bg-linear-to-r from-primary to-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova Vaga
          </Button>
        )}
      </div>

      {vagas.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-border/80 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
          <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-40" />
          {isOwner
            ? "Crie a primeira vaga para comunicar quais perfis o projeto procura."
            : "Este projeto ainda não cadastrou vagas."}
        </Card>
      ) : (
        <div className="grid gap-3">
          {vagas.map((vaga) => {
            const completa = vaga.preenchidas >= vaga.quantidade;
            return (
              <motion.div
                key={vaga.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="rounded-2xl border border-border/50 bg-card/65 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground/90">
                          {vaga.funcao_nome}
                        </p>
                        <Badge
                          variant={vaga.status === "aberta" ? "default" : "outline"}
                          className={
                            vaga.status === "aberta"
                              ? "rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "rounded-full text-muted-foreground"
                          }
                        >
                          {vaga.status === "aberta" ? "Aberta" : "Fechada"}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          Nível: {nivelLabel(vaga.nivel_desejado)}
                        </Badge>
                      </div>
                      {vaga.descricao && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {vaga.descricao}
                        </p>
                      )}
                      <p className="text-xs font-medium text-muted-foreground">
                        {completa ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Vaga preenchida ({vaga.preenchidas}/{vaga.quantidade})
                          </span>
                        ) : (
                          <>
                            {vaga.preenchidas}/{vaga.quantidade} preenchidas
                          </>
                        )}
                      </p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-8"
                          onClick={() => openEdit(vaga)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/35 h-8"
                          onClick={() => handleDelete(vaga)}
                          disabled={deletingId === vaga.id}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {deletingId === vaga.id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <VagaFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vaga={editing}
        funcoes={funcoes}
        projectId={projectId}
        onSaved={handleSaved}
      />
    </div>
  );
}
