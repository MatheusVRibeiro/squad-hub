import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  User,
  Check,
  MoreVertical,
  Calendar,
  CheckSquare,
  Trash,
  Sparkles,
  Loader2,
  Hand,
  GraduationCap,
  History,
  UserMinus,
  ArrowLeftRight,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addLocalTask,
  updateLocalTaskStatus,
  updateLocalTaskAssignee,
  updateLocalTaskDetails,
  claimTask,
  type KanbanStatus,
  type KanbanTask,
  type Member,
  type SubTask,
  type TaskDificuldade,
} from "@/services/projectDetail";
import { fetchHabilidades, type Habilidade } from "@/services/perfil";
import { notificationsIntegration } from "@/services/notificationsIntegration";
import {
  abandonarTarefa,
  removerResponsavel,
  reatribuirTarefa,
  getHistoricoResponsaveis,
  type HistoricoResponsavel,
} from "@/services/tasks";
import { GithubTaskBadge } from "@/components/projects/GithubTaskBadge";
import { GithubTaskActivity } from "@/components/projects/GithubTaskActivity";
import { KanbanToolbar, type PriorityFilterValue } from "@/components/projects/KanbanToolbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const COLUMNS: { key: KanbanStatus; label: string; tone: string; borderTone: string }[] = [
  {
    key: "todo",
    label: "A fazer",
    tone: "bg-muted/80 text-muted-foreground border border-muted-foreground/10",
    borderTone: "border-l-muted-foreground/40",
  },
  {
    key: "doing",
    label: "Em progresso",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    borderTone: "border-l-amber-500",
  },
  {
    key: "review",
    label: "Em revisão",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20",
    borderTone: "border-l-sky-500",
  },
  {
    key: "done",
    label: "Concluído",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    borderTone: "border-l-emerald-500",
  },
];

/** Normaliza acentos/maiúsculas para casar nomes de habilidades com a base
 *  global (mesmo critério usado em services/perfil.ts). */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** ETAPA 7: rótulos e tons da prioridade (badge do card). */
const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};
const PRIORITY_TONE: Record<string, string> = {
  high: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  low: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
};

/** ETAPA 7: rótulos e tons da dificuldade (detalhe secundário do card). */
const DIFICULDADE_LABEL: Record<string, string> = {
  avancada: "Avançada",
  intermediaria: "Intermediária",
  iniciante: "Iniciante",
};
const DIFICULDADE_TONE: Record<string, string> = {
  avancada: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
  intermediaria: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400",
  iniciante: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
};

/** ETAPA 7: formata o prazo no padrão do card — "12/out" (pt-BR, sem "de").
 *  Datas puras "YYYY-MM-DD" são tratadas como hora local para não deslocar o dia. */
function formatDueDate(iso?: string): string {
  if (!iso) return "";
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(" de ", "/")
    .replace(".", "");
}

export function KanbanBoard({
  initial,
  projectId,
  projectName,
  readOnly,
  members = [],
  isOwner = false,
}: {
  initial: KanbanTask[];
  projectId: string;
  projectName: string;
  readOnly?: boolean;
  members?: Member[];
  /** ETAPA 9: usuário logado é o dono do projeto (libera remover/reatribuir). */
  isOwner?: boolean;
}) {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<KanbanTask[]>(initial);
  // ETAPA 6: filtros visuais do Kanban (só frontend — não alteram persistência).
  const [searchTerm, setSearchTerm] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterValue>("all");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [modalCol, setModalCol] = useState<KanbanStatus>("todo");
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [assignee, setAssignee] = useState<string | undefined>(undefined);
  // ETAPA 7: dificuldade + habilidades da tarefa (multi-select de chips).
  const [dificuldade, setDificuldade] = useState<TaskDificuldade>("intermediaria");
  const [habilidadeIds, setHabilidadeIds] = useState<number[]>([]);
  const [habilidadesDisponiveis, setHabilidadesDisponiveis] = useState<Habilidade[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  // ETAPA 9: abandonar / remover responsável / reatribuir + histórico.
  const [abandoningId, setAbandoningId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reassignTask, setReassignTask] = useState<KanbanTask | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [historico, setHistorico] = useState<HistoricoResponsavel[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  // ETAPA 7: carrega a base global de habilidades para o multi-select do modal.
  useEffect(() => {
    let ativo = true;
    fetchHabilidades()
      .then((habs) => {
        if (ativo) setHabilidadesDisponiveis(habs);
      })
      .catch(() => {
        // Modal segue utilizável sem a lista (chips vazios).
        if (ativo) setHabilidadesDisponiveis([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // ETAPA 6: opções do filtro de responsável — nomes presentes nas tasks.
  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Set(tasks.map((t) => t.assignee).filter((a): a is string => Boolean(a && a.trim()))),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [tasks],
  );

  // ETAPA 6: filtro combinado (título + responsável + prioridade) — apenas visual.
  const filteredTasks = useMemo(() => {
    const q = normalizeText(searchTerm);
    return tasks.filter((t) => {
      if (q && !normalizeText(t.title).includes(q)) return false;
      if (assigneeFilter !== "all" && t.assignee !== assigneeFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, searchTerm, assigneeFilter, priorityFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" || assigneeFilter !== "all" || priorityFilter !== "all";

  function openCreateModal(colKey: KanbanStatus) {
    setModalCol(colKey);
    setTitle("");
    setDesc("");
    setPriority("medium");
    setDueDate("");
    setSubtasks([]);
    setNewSubtask("");
    setAssignee(undefined);
    setDificuldade("intermediaria");
    setHabilidadeIds([]);
    setEditingTask(null);
    setModalMode("create");
  }

  function toggleHabilidade(id: number) {
    setHabilidadeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function openEditModal(task: KanbanTask) {
    setEditingTask(task);
    setTitle(task.title);
    setDesc(task.description || "");
    setPriority(task.priority || "medium");
    setDueDate(task.dueDate || "");
    setSubtasks(task.subtasks || []);
    setNewSubtask("");
    setAssignee(task.assignee);
    setDificuldade(task.dificuldade || "intermediaria");
    // Prefere os ids persistidos; caso contrário, casa nomes com a base global.
    const ids = task.habilidadeIds ?? [];
    setHabilidadeIds(
      ids.length > 0
        ? ids
        : (task.habilidades ?? [])
            .map((nome) => {
              const norm = normalizeText(nome);
              return habilidadesDisponiveis.find((h) => normalizeText(h.nome) === norm)?.id;
            })
            .filter((id): id is number => id != null),
    );
    setModalMode("edit");
    // ETAPA 9: carrega o histórico de responsáveis ao abrir o modal de edição.
    loadHistorico(task.id);
  }

  async function move(id: string, status: KanbanStatus) {
    if (readOnly) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const oldStatus = task.status;
    if (oldStatus === status) return;

    // 1. Persiste na API — anti-fallback (C2): falha PROPAGA e NÃO atualiza a UI
    try {
      await updateLocalTaskStatus(projectId, id, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover a tarefa.");
      return;
    }

    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));

    // ETAPA 10: XP agora é concedido SOMENTE pelo backend (idempotente).
    // O navegador não controla mais XP — apenas reflete o resultado da API.
    // Nota: o feedback visual de XP virá da estatística retornada pelo backend.

    // 2. Dispara notificação
    const colName = COLUMNS.find((c) => c.key === status)?.label || status;
    notificationsIntegration.notifyTaskActivity(
      projectName,
      task.title,
      "moved",
      colName,
      projectId,
    );
  }

  async function handleAssign(taskId: string, assigneeName: string | undefined) {
    if (readOnly) return;

    // 1. Persiste na API — anti-fallback (C2): falha PROPAGA e NÃO atualiza a UI
    try {
      await updateLocalTaskAssignee(projectId, taskId, assigneeName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atribuir responsável.");
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, assignee: assigneeName } : t)));

    if (assigneeName) {
      toast.success(`Tarefa atribuída a ${assigneeName}`);
      notificationsIntegration.notifyTaskActivity(
        projectName,
        tasks.find((t) => t.id === taskId)?.title || "Tarefa",
        "assigned",
        assigneeName,
        projectId,
      );
    } else {
      toast.success("Responsável removido");
    }
  }

  // ETAPA 7: membro assume task livre (POST .../assumir) — status vira doing
  async function handleClaim(taskId: string) {
    if (readOnly) return;
    setClaimingId(taskId);
    try {
      const updated = await claimTask(projectId, taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: updated.status || "doing",
                assignee: updated.assignee || "Você",
                githubBranch: updated.githubBranch,
              }
            : t,
        ),
      );
      toast.success("Tarefa assumida! Status: Em progresso");
      notificationsIntegration.notifyTaskActivity(
        projectName,
        tasks.find((t) => t.id === taskId)?.title || "Tarefa",
        "assigned",
        "Você",
        projectId,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao assumir tarefa");
    } finally {
      setClaimingId(null);
    }
  }

  // ETAPA 9: responsável atual abandona a task — volta para 'todo' sem
  // responsável; o backend registra o histórico (acao='abandonou').
  async function handleAbandon(taskId: string) {
    if (readOnly) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (
      !window.confirm(
        `Tem certeza que deseja abandonar a tarefa "${task.title}"? Ela voltará para "A fazer" e ficará sem responsável.`,
      )
    )
      return;

    setAbandoningId(taskId);
    try {
      const updated = await abandonarTarefa(projectId, taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, assignee: undefined, status: updated.status || "todo" } : t,
        ),
      );
      toast.success("Tarefa abandonada! Ela voltou para 'A fazer'.");
      notificationsIntegration.notifyTaskActivity(
        projectName,
        task.title,
        "moved",
        "A fazer",
        projectId,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abandonar tarefa");
    } finally {
      setAbandoningId(null);
    }
  }

  // ETAPA 9: owner remove o responsável atual (histórico registra 'removido').
  async function handleRemoveAssignee(taskId: string) {
    if (readOnly) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (
      !window.confirm(
        `Remover ${task.assignee || "o responsável"} da tarefa "${task.title}"? O histórico de contribuição será preservado.`,
      )
    )
      return;

    setRemovingId(taskId);
    try {
      await removerResponsavel(projectId, taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, assignee: undefined } : t)));
      toast.success("Responsável removido da tarefa.");
      notificationsIntegration.notifyTaskActivity(
        projectName,
        task.title,
        "assigned",
        "Sem responsável",
        projectId,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover responsável");
    } finally {
      setRemovingId(null);
    }
  }

  // ETAPA 9: owner reatribui a task a outro membro ativo do squad.
  async function handleReassign() {
    if (!reassignTask) return;
    const member = members.find((m) => m.id === reassignUserId);
    if (!member) {
      toast.error("Selecione um membro ativo para reatribuir.");
      return;
    }
    setReassigning(true);
    try {
      const updated = await reatribuirTarefa(projectId, reassignTask.id, Number(member.id));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === reassignTask.id
            ? { ...t, assignee: member.name, status: updated.status || t.status }
            : t,
        ),
      );
      toast.success(`Tarefa reatribuída para ${member.name}.`);
      notificationsIntegration.notifyTaskActivity(
        projectName,
        reassignTask.title,
        "assigned",
        member.name,
        projectId,
      );
      setReassignTask(null);
      setReassignUserId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reatribuir tarefa");
    } finally {
      setReassigning(false);
    }
  }

  // ETAPA 9: carrega o histórico de responsáveis da task (painel do modal).
  async function loadHistorico(taskId: string) {
    setHistoricoLoading(true);
    setHistoricoError(null);
    try {
      setHistorico(await getHistoricoResponsaveis(projectId, taskId));
    } catch (err) {
      setHistorico([]);
      setHistoricoError(err instanceof Error ? err.message : "Erro ao carregar histórico");
    } finally {
      setHistoricoLoading(false);
    }
  }

  // Métodos de edição de subtarefas no modal
  function handleAddSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    const next: SubTask = { id: `sub-${Date.now()}`, title, done: false };
    setSubtasks([...subtasks, next]);
    setNewSubtask("");
  }

  function handleToggleSubtask(subId: string) {
    setSubtasks(subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)));
  }

  function handleDeleteSubtask(subId: string) {
    setSubtasks(subtasks.filter((s) => s.id !== subId));
  }

  async function handleSaveDetails() {
    if (!editingTask) return;

    // ETAPA 7: deriva os nomes das habilidades selecionadas para refletir no card.
    const habilidades = habilidadeIds
      .map((id) => habilidadesDisponiveis.find((h) => h.id === id)?.nome)
      .filter((nome): nome is string => nome != null);

    const updates = {
      description: desc,
      priority,
      dueDate,
      subtasks,
      assignee,
      dificuldade,
      habilidadeIds,
      habilidades,
    };

    // Persiste na API — anti-fallback (C2): falha PROPAGA e NÃO atualiza a UI
    try {
      await updateLocalTaskDetails(projectId, editingTask.id, updates);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar os detalhes.");
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...updates } : t)));
    toast.success("Detalhes salvos com sucesso");
    setModalMode(null);
  }

  async function handleCreateTask() {
    const taskTitle = title.trim();
    if (!taskTitle) {
      toast.error("Por favor, digite o título da tarefa.");
      return;
    }

    // ETAPA 7: nomes derivados dos ids selecionados para o badge do card.
    const habilidades = habilidadeIds
      .map((id) => habilidadesDisponiveis.find((h) => h.id === id)?.nome)
      .filter((nome): nome is string => nome != null);

    const extra = {
      description: desc,
      priority,
      dueDate,
      subtasks,
      assignee,
      status: modalCol,
      dificuldade,
      habilidadeIds,
      habilidades,
    };

    // 1. Persiste na API — anti-fallback (C2): falha PROPAGA e NÃO cria task local
    let createdTask: KanbanTask;
    try {
      createdTask = await addLocalTask(projectId, taskTitle, extra);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar a tarefa.");
      return;
    }

    setTasks((t) => [...t, createdTask]);
    toast.success("Tarefa criada com sucesso!");
    setModalMode(null);

    // 2. Dispara notificação
    notificationsIntegration.notifyTaskActivity(projectName, taskTitle, "created", "", projectId);

    // ETAPA 10: XP é concedido pelo backend (idempotente), nunca aqui.
  }

  return (
    <div className="space-y-4">
      {/* ETAPA 6: toolbar de filtros (busca por título, responsável, prioridade). */}
      <KanbanToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        assigneeOptions={assigneeOptions}
        assigneeFilter={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        resultCount={filteredTasks.length}
        totalCount={tasks.length}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm("");
          setAssigneeFilter("all");
          setPriorityFilter("all");
        }}
      />

      {/* ETAPA 16: abaixo de xl o Kanban rola horizontalmente com largura fixa
          por coluna (não comprime cards em tablet/mobile); em xl+ vira grid de
          4 colunas distribuídas. Drag-and-drop (HTML5) funciona nos dois modos. */}
      <div className="flex gap-6 overflow-x-auto pb-2 xl:grid xl:grid-cols-4 xl:overflow-x-visible">
        {COLUMNS.map((col) => {
          const list = filteredTasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                if (!readOnly) e.preventDefault();
              }}
              onDrop={() => {
                if (readOnly) return;
                if (dragId) move(dragId, col.key);
                setDragId(null);
              }}
              className={cn(
                "flex min-h-[450px] w-[280px] shrink-0 flex-col gap-4 rounded-2xl border border-border/50 bg-card/45 p-4 backdrop-blur-sm transition-all duration-300 xl:w-auto xl:min-w-0",
                dragId ? "border-primary/20 bg-primary/5/10 shadow-sm" : "",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide shadow-sm",
                      col.tone,
                    )}
                  >
                    {col.label}
                  </span>
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-muted/40 px-1 text-[10px] font-medium text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => openCreateModal(col.key)}
                    aria-label={`Adicionar em ${col.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2.5">
                {list.map((t) => {
                  const isAssignedToMe =
                    t.assignee === currentUser?.name ||
                    (t.assignee === "Você" && (currentUser?.name === "Você" || !currentUser?.name));
                  const completedSubtasks = t.subtasks?.filter((s) => s.done).length || 0;
                  const totalSubtasks = t.subtasks?.length || 0;
                  // ETAPA 7: linha de evidência (subtarefas + GitHub) só aparece com conteúdo.
                  const hasEvidence =
                    totalSubtasks > 0 ||
                    Boolean(
                      t.githubBranch ||
                      t.githubCommitsCount ||
                      t.githubPrNumber ||
                      t.githubPrStatus ||
                      t.completionSource,
                    );

                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card
                        draggable={!readOnly}
                        onDragStart={() => !readOnly && setDragId(t.id)}
                        onDragEnd={() => !readOnly && setDragId(null)}
                        onClick={() => !readOnly && openEditModal(t)}
                        className={cn(
                          "group relative overflow-hidden border-l-4 border-y border-r border-border/60 bg-card/90 p-4 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                          col.borderTone,
                          !readOnly ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                        )}
                      >
                        {/* ETAPA 7 — prioridade visual: 1. título · 2. prioridade */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 font-medium leading-snug text-foreground/90 transition-colors group-hover:text-primary">
                            {t.title}
                          </p>

                          {t.priority && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                PRIORITY_TONE[t.priority],
                              )}
                            >
                              {PRIORITY_LABEL[t.priority]}
                            </Badge>
                          )}

                          {/* Ação rápida para mobile */}
                          {!readOnly && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted md:hidden"
                                  aria-label="Mover tarefa"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-40 rounded-xl shadow-md"
                              >
                                <DropdownMenuLabel className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                                  Mover para
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => move(t.id, "todo")}
                                  disabled={t.status === "todo"}
                                  className="cursor-pointer px-2 py-1.5 text-xs"
                                >
                                  A fazer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => move(t.id, "doing")}
                                  disabled={t.status === "doing"}
                                  className="cursor-pointer px-2 py-1.5 text-xs"
                                >
                                  Em progresso
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => move(t.id, "review")}
                                  disabled={t.status === "review"}
                                  className="cursor-pointer px-2 py-1.5 text-xs"
                                >
                                  Em revisão
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => move(t.id, "done")}
                                  disabled={t.status === "done"}
                                  className="cursor-pointer px-2 py-1.5 text-xs"
                                >
                                  Concluído
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        {/* Resumo (descrição) — apenas se houver */}
                        {t.description && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/85">
                            {t.description}
                          </p>
                        )}

                        {/* ETAPA 7 — 3. prazo · 4. responsável */}
                        {(t.dueDate || t.assignee) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                            {t.dueDate && (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/85" />
                                {formatDueDate(t.dueDate)}
                              </span>
                            )}
                            {t.dueDate && <span className="text-muted-foreground/30">·</span>}
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/85" />
                              <span
                                className={cn(
                                  "truncate",
                                  t.assignee
                                    ? "font-medium text-foreground/80"
                                    : "text-muted-foreground/70",
                                )}
                              >
                                {t.assignee || "Sem responsável"}
                              </span>
                            </span>
                          </div>
                        )}

                        {/* ETAPA 7 — única ação de assumir (task livre) */}
                        {!t.assignee && !readOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(t.id);
                            }}
                            disabled={claimingId === t.id}
                            className="mt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-600 outline-none transition-all hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-400"
                          >
                            {claimingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Hand className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>Assumir tarefa</span>
                          </button>
                        )}

                        {/* ETAPA 7 — 5. subtarefas · 6. evidência GitHub */}
                        {hasEvidence && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {totalSubtasks > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border/10 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <CheckSquare className="h-3 w-3 text-muted-foreground/85" />
                                {completedSubtasks}/{totalSubtasks}
                              </span>
                            )}
                            <GithubTaskBadge
                              branch={t.githubBranch}
                              commitsCount={t.githubCommitsCount}
                              lastActivityAt={t.githubLastActivityAt}
                              prNumber={t.githubPrNumber}
                              prStatus={t.githubPrStatus}
                              completionSource={t.completionSource}
                            />
                          </div>
                        )}

                        {/* ETAPA 7 — 7. detalhes secundários (dificuldade + habilidades) */}
                        {(t.dificuldade || (t.habilidades?.length ?? 0) > 0) && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {t.dificuldade && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                  DIFICULDADE_TONE[t.dificuldade],
                                )}
                              >
                                <GraduationCap className="h-3 w-3" />
                                {DIFICULDADE_LABEL[t.dificuldade]}
                              </span>
                            )}
                            {t.habilidades?.slice(0, 2).map((h) => (
                              <span
                                key={h}
                                className="rounded-full border border-border/10 bg-muted/20 px-2 py-0.5 text-[9px] font-medium text-muted-foreground/80"
                              >
                                {h}
                              </span>
                            ))}
                            {(t.habilidades?.length ?? 0) > 2 && (
                              <span className="text-[9px] font-medium text-muted-foreground/70">
                                +{(t.habilidades?.length ?? 0) - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* ETAPA 7 — ações funcionais: responsável, abandonar, owner */}
                        {!readOnly && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-2.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  title={t.assignee || "Sem responsável"}
                                  aria-label="Alterar responsável"
                                  className={cn(
                                    "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-all outline-none",
                                    t.assignee
                                      ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                                      : "border-border/60 bg-muted text-muted-foreground hover:bg-muted/80",
                                  )}
                                >
                                  <User className="h-3.5 w-3.5 shrink-0" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="w-48 rounded-xl border border-border/80 bg-card/95 shadow-lg backdrop-blur"
                              >
                                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Responsável
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAssign(t.id, undefined)}
                                  className="cursor-pointer px-2 py-1.5 text-xs focus:bg-destructive/10 focus:text-destructive"
                                >
                                  Remover responsável
                                </DropdownMenuItem>
                                {members.map((m) => (
                                  <DropdownMenuItem
                                    key={m.id}
                                    onClick={() => handleAssign(t.id, m.name)}
                                    className="flex cursor-pointer items-center justify-between px-2 py-1.5 text-xs"
                                  >
                                    <span>{m.name}</span>
                                    {(t.assignee === m.name ||
                                      (t.assignee === "Você" && m.name === "Você")) && (
                                      <Check className="h-3 w-3 text-primary" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex items-center gap-1.5">
                              {/* ETAPA 9: responsável atual pode abandonar a task */}
                              {isAssignedToMe && t.assignee && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAbandon(t.id);
                                  }}
                                  disabled={abandoningId === t.id}
                                  title="Abandonar tarefa"
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-amber-700 outline-none transition-all hover:bg-amber-500/20 disabled:opacity-60 dark:text-amber-400"
                                >
                                  {abandoningId === t.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Hand className="h-3 w-3 shrink-0" />
                                  )}
                                  <span>Abandonar</span>
                                </button>
                              )}

                              {/* ETAPA 9: owner remove responsável ou reatribui a outro membro */}
                              {isOwner && t.assignee && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveAssignee(t.id);
                                    }}
                                    disabled={removingId === t.id}
                                    title="Remover responsável"
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-rose-700 outline-none transition-all hover:bg-rose-500/20 disabled:opacity-60 dark:text-rose-400"
                                  >
                                    {removingId === t.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <UserMinus className="h-3 w-3 shrink-0" />
                                    )}
                                    <span className="hidden sm:inline">Remover</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReassignTask(t);
                                      setReassignUserId("");
                                    }}
                                    title="Reatribuir a outro membro"
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-primary outline-none transition-all hover:bg-primary/20"
                                  >
                                    <ArrowLeftRight className="h-3 w-3 shrink-0" />
                                    <span className="hidden sm:inline">Reatribuir</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
                {list.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 p-6 text-center">
                    <Inbox className="h-5 w-5 text-muted-foreground/50" />
                    <p className="text-xs font-medium text-muted-foreground/70">
                      {hasActiveFilters
                        ? "Nenhuma tarefa corresponde aos filtros"
                        : readOnly
                          ? "Nenhuma tarefa aqui"
                          : "Arraste tasks para cá"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog de Detalhes / Criação de Tarefa */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && setModalMode(null)}>
        <DialogContent className="rounded-3xl max-w-lg border border-border/60 bg-card/98 backdrop-blur shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {modalMode === "create" ? "Criar Nova Tarefa" : "Editar Tarefa"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {modalMode === "create"
                ? "Defina o escopo, subtarefas, prazo, prioridade e responsável para este novo cartão."
                : "Atualize escopos, subtarefas, data limite e prioridades deste cartão."}
            </DialogDescription>
          </DialogHeader>

          {modalMode !== null && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide">
                  Título da tarefa
                </Label>
                {modalMode === "create" ? (
                  <Input
                    id="task-title"
                    placeholder="Título da tarefa..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 rounded-xl border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm font-semibold"
                  />
                ) : (
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-xl font-semibold text-sm">
                    {title}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="task-priority"
                    className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                  >
                    Prioridade
                  </Label>
                  <Select
                    value={priority}
                    onValueChange={(val) => setPriority(val as "low" | "medium" | "high")}
                  >
                    <SelectTrigger
                      id="task-priority"
                      className="h-10 rounded-xl bg-background/40 text-xs"
                    >
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="task-duedate"
                    className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                  >
                    Prazo de Entrega
                  </Label>
                  <Input
                    id="task-duedate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 rounded-xl bg-background/40 text-xs focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="task-assignee"
                    className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                  >
                    Responsável
                  </Label>
                  <Select
                    value={assignee || "unassigned"}
                    onValueChange={(val) => setAssignee(val === "unassigned" ? undefined : val)}
                  >
                    <SelectTrigger
                      id="task-assignee"
                      className="h-10 rounded-xl bg-background/40 text-xs"
                    >
                      <SelectValue placeholder="Sem responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sem responsável</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ETAPA 7: Dificuldade + Habilidades da tarefa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="task-dificuldade"
                    className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                  >
                    Dificuldade
                  </Label>
                  <Select
                    value={dificuldade}
                    onValueChange={(val) => setDificuldade(val as TaskDificuldade)}
                  >
                    <SelectTrigger
                      id="task-dificuldade"
                      className="h-10 rounded-xl bg-background/40 text-xs"
                    >
                      <SelectValue placeholder="Dificuldade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediaria">Intermediária</SelectItem>
                      <SelectItem value="avancada">Avançada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide">
                    Habilidades ({habilidadeIds.length} selecionadas)
                  </Label>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {habilidadesDisponiveis.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        Nenhuma habilidade disponível no momento.
                      </span>
                    ) : (
                      habilidadesDisponiveis.map((h) => {
                        const ativa = habilidadeIds.includes(h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => toggleHabilidade(h.id)}
                            className="outline-none cursor-pointer"
                            aria-pressed={ativa}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] transition-all font-medium border",
                                ativa
                                  ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"
                                  : "bg-background/20 border-border/80 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                              )}
                            >
                              {ativa ? (
                                <Check className="mr-1 inline h-3 w-3" />
                              ) : (
                                <Plus className="mr-1 inline h-3 w-3" />
                              )}
                              {h.nome}
                            </Badge>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="task-desc"
                  className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                >
                  Descrição detalhada
                </Label>
                <Textarea
                  id="task-desc"
                  placeholder="Escreva detalhes sobre o escopo, link de mocks ou critérios de aceitação..."
                  className="rounded-xl border-border/60 bg-background/40 p-3 text-xs leading-relaxed resize-none focus-visible:ring-primary/20"
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* Seção Checklist / Subtarefas */}
              <div className="space-y-2 border-t border-border/20 pt-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-foreground/85 uppercase tracking-wide">
                  <span>Subtarefas / Checklist</span>
                  <span>
                    {subtasks.filter((s) => s.done).length}/{subtasks.length} concluídas
                  </span>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {subtasks.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between bg-muted/20 border border-border/20 rounded-xl px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={s.done}
                            onChange={() => handleToggleSubtask(s.id)}
                            className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                          />
                          <span
                            className={cn(
                              "font-medium",
                              s.done ? "line-through text-muted-foreground" : "text-foreground/85",
                            )}
                          >
                            {s.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(s.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors outline-none cursor-pointer"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar subtarefa */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar subtarefa..."
                    className="h-10 rounded-xl bg-background/40 text-xs focus-visible:ring-primary/20 flex-1"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSubtask}
                    className="h-10 px-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors font-semibold text-xs border-border/60"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-border/20">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl h-10 px-4 text-xs font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={modalMode === "create" ? handleCreateTask : handleSaveDetails}
                  className="rounded-xl h-10 px-5 text-xs font-semibold shadow-sm"
                >
                  {modalMode === "create" ? "Criar Tarefa" : "Salvar Alterações"}
                </Button>
              </div>

              {/* Atividade GitHub da tarefa (ETAPA 8) — apenas no modo edição */}
              {modalMode === "edit" && editingTask && (
                <GithubTaskActivity projectId={projectId} taskId={editingTask.id} open />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
