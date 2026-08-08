import { useState, useEffect } from "react";
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
} from "@/services/projectDetail";
import { notificationsIntegration } from "@/services/notificationsIntegration";
import { GithubTaskBadge } from "@/components/projects/GithubTaskBadge";
import { GithubTaskActivity } from "@/components/projects/GithubTaskActivity";
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
import { awardLocalXP } from "@/services/reputation";

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

export function KanbanBoard({
  initial,
  projectId,
  projectName,
  readOnly,
  members = [],
}: {
  initial: KanbanTask[];
  projectId: string;
  projectName: string;
  readOnly?: boolean;
  members?: Member[];
}) {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<KanbanTask[]>(initial);
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  function openCreateModal(colKey: KanbanStatus) {
    setModalCol(colKey);
    setTitle("");
    setDesc("");
    setPriority("medium");
    setDueDate("");
    setSubtasks([]);
    setNewSubtask("");
    setAssignee(undefined);
    setEditingTask(null);
    setModalMode("create");
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
    setModalMode("edit");
  }

  async function move(id: string, status: KanbanStatus) {
    if (readOnly) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const oldStatus = task.status;
    if (oldStatus === status) return;

    // 1. Persiste localmente
    await updateLocalTaskStatus(projectId, id, status);

    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));

    // Se a tarefa for movida para "Concluído" (done), concede XP
    if (status === "done" && oldStatus !== "done") {
      const { levelUp, nextLevel } = await awardLocalXP(150);
      if (!levelUp) {
        toast.success("Parabéns! +150 XP acumulados com a tarefa concluída! 🎉");
      }
    }

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

    // 1. Persiste localmente via serviço
    await updateLocalTaskAssignee(projectId, taskId, assigneeName);

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

    const updates = {
      description: desc,
      priority,
      dueDate,
      subtasks,
      assignee,
    };

    await updateLocalTaskDetails(projectId, editingTask.id, updates);
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

    const extra = {
      description: desc,
      priority,
      dueDate,
      subtasks,
      assignee,
      status: modalCol,
    };

    // 1. Persiste localmente com campos extras
    const createdTask = await addLocalTask(projectId, taskTitle, extra);

    setTasks((t) => [...t, createdTask]);
    toast.success("Tarefa criada com sucesso!");
    setModalMode(null);

    // 2. Dispara notificação
    notificationsIntegration.notifyTaskActivity(projectName, taskTitle, "created", "", projectId);

    // Concede XP se a tarefa for concluída
    if (modalCol === "done") {
      const { levelUp } = await awardLocalXP(150);
      if (!levelUp) {
        toast.success("Parabéns! +150 XP acumulados com a tarefa concluída! 🎉");
      }
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col.key);
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
              "flex min-h-[450px] flex-col gap-4 rounded-2xl border border-border/50 bg-card/45 p-4 backdrop-blur-sm transition-all duration-300",
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
                      className={cn(
                        "group relative overflow-hidden border-l-4 border-y border-r border-border/60 bg-card/90 p-4 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                        col.borderTone,
                        !readOnly ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                      )}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          onClick={() => !readOnly && setEditingTask(t)}
                          className={cn(
                            "font-medium leading-snug text-foreground/90 group-hover:text-foreground flex-1",
                            !readOnly ? "cursor-pointer hover:text-primary" : "",
                          )}
                        >
                          {t.title}
                        </p>

                        {/* Ação rápida para mobile */}
                        {!readOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="h-6 w-6 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted md:hidden cursor-pointer outline-none shrink-0"
                                aria-label="Mover tarefa"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-md">
                              <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                                Mover para
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => move(t.id, "todo")}
                                disabled={t.status === "todo"}
                                className="cursor-pointer text-xs py-1.5 px-2"
                              >
                                A fazer
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => move(t.id, "doing")}
                                disabled={t.status === "doing"}
                                className="cursor-pointer text-xs py-1.5 px-2"
                              >
                                Em progresso
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => move(t.id, "review")}
                                disabled={t.status === "review"}
                                className="cursor-pointer text-xs py-1.5 px-2"
                              >
                                Em revisão
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => move(t.id, "done")}
                                disabled={t.status === "done"}
                                className="cursor-pointer text-xs py-1.5 px-2"
                              >
                                Concluído
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Badges de prioridade, prazo e subtarefas */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {t.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full text-[9px] font-bold py-0.5 px-2 tracking-wide uppercase border",
                              t.priority === "high"
                                ? "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400"
                                : t.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                                  : "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
                            )}
                          >
                            {t.priority === "low"
                              ? "Baixa"
                              : t.priority === "medium"
                                ? "Média"
                                : "Alta"}
                          </Badge>
                        )}

                        {t.dueDate && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/10 font-medium">
                            <Calendar className="h-3 w-3 text-muted-foreground/85" />
                            {new Date(t.dueDate).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}

                        {totalSubtasks > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/10 font-medium">
                            <CheckSquare className="h-3 w-3 text-muted-foreground/85" />
                            {completedSubtasks}/{totalSubtasks}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-3">
                        {!t.assignee && !readOnly && (
                          <button
                            onClick={() => handleClaim(t.id)}
                            disabled={claimingId === t.id}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide border transition-all outline-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer disabled:opacity-60"
                          >
                            {claimingId === t.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Hand className="h-3 w-3 shrink-0" />
                            )}
                            <span>Assumir tarefa</span>
                          </button>
                        )}
                        <GithubTaskBadge
                          branch={t.githubBranch}
                          commitsCount={t.githubCommitsCount}
                          lastActivityAt={t.githubLastActivityAt}
                          prNumber={t.githubPrNumber}
                          prStatus={t.githubPrStatus}
                          completionSource={t.completionSource}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={readOnly}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide border transition-all text-left outline-none",
                                t.assignee
                                  ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                                  : readOnly
                                    ? "bg-muted text-muted-foreground border-border cursor-default"
                                    : "bg-muted text-muted-foreground border-border hover:bg-muted/80 cursor-pointer",
                              )}
                            >
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[80px]">
                                {t.assignee || "Sem responsável"}
                              </span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="w-48 rounded-xl shadow-lg border border-border/80 bg-card/95 backdrop-blur"
                          >
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                              Responsável
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAssign(t.id, undefined)}
                              className="cursor-pointer text-xs focus:bg-destructive/10 focus:text-destructive py-1.5 px-2"
                            >
                              Remover responsável
                            </DropdownMenuItem>
                            {members.map((m) => (
                              <DropdownMenuItem
                                key={m.id}
                                onClick={() => handleAssign(t.id, m.name)}
                                className="cursor-pointer text-xs flex items-center justify-between py-1.5 px-2"
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

                        {!readOnly && !isAssignedToMe && (
                          <button
                            type="button"
                            onClick={() => handleAssign(t.id, currentUser?.name || "Você")}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider outline-none cursor-pointer"
                          >
                            Pegar tarefa
                          </button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

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
