import { useState } from "react";
import { Calendar, CheckCircle2, Github, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KanbanStatus, KanbanTask } from "@/services/projectDetail";

const STATUS_LABEL: Record<KanbanStatus, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  review: "Em revisão",
  done: "Concluído",
};

const STATUS_TONE: Record<KanbanStatus, string> = {
  todo: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  doing: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400",
  review: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400",
  done: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  high: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
};

/**
 * ETAPA 11 (Kanban escalável) — Modo Lista.
 * Usa o MESMO `filteredTasks` do board (nenhuma query nova, nenhuma regra de
 * negócio duplicada). Ações de editar/assumir chamam os mesmos handlers via
 * callbacks. Alternar Quadro/Lista não altera filtros nem perde estado.
 */
export function KanbanListView({
  tasks,
  readOnly,
  onEdit,
  onClaim,
  claimingId,
}: {
  tasks: KanbanTask[];
  readOnly?: boolean;
  onEdit: (task: KanbanTask) => void;
  onClaim: (taskId: string) => void;
  claimingId: string | null;
}) {
  // ETAPA perf: lista com carregamento progressivo — mostra 50 linhas e
  // expande com "Ver mais N" (mesma filosofia do board, que limita a 20/coluna).
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 50;

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
        Nenhuma tarefa corresponde aos filtros.
      </div>
    );
  }

  const visible = showAll ? tasks : tasks.slice(0, LIMIT);
  const hidden = tasks.length - visible.length;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/50">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-semibold">ID</th>
            <th className="px-3 py-2.5 font-semibold">Task</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Responsável</th>
            <th className="px-3 py-2.5 font-semibold">Prioridade</th>
            <th className="px-3 py-2.5 font-semibold">Prazo</th>
            <th className="px-3 py-2.5 font-semibold">GitHub/PR</th>
            <th className="px-3 py-2.5 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {visible.map((t) => (
            <tr
              key={t.id}
              className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">#{t.id}</td>
              <td className="max-w-[260px] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="cursor-pointer truncate text-left font-medium text-foreground/90 hover:text-primary"
                >
                  {t.title}
                </button>
              </td>
              <td className="px-3 py-2.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border text-[10px] font-semibold",
                    STATUS_TONE[t.status],
                  )}
                >
                  {STATUS_LABEL[t.status]}
                </Badge>
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {t.assignee || "Sem responsável"}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {t.priority ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border text-[10px] font-semibold",
                      PRIORITY_TONE[t.priority],
                    )}
                  >
                    {PRIORITY_LABEL[t.priority] ?? t.priority}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {t.dueDate ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(t.dueDate).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {t.githubPrUrl || t.githubBranch ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Github className="h-3 w-3" />
                    {t.githubPrStatus === "merged" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                    {t.githubPrNumber ? `PR #${t.githubPrNumber}` : t.githubBranch}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                {!readOnly && !t.assignee && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg text-[11px]"
                    onClick={() => onClaim(t.id)}
                    disabled={claimingId === t.id}
                  >
                    {claimingId === t.id ? "..." : "Assumir"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ETAPA perf: footer de carregamento progressivo da lista. */}
      {hidden > 0 && (
        <div className="flex items-center justify-center border-t border-border/40 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Ver mais {hidden} {hidden === 1 ? "tarefa" : "tarefas"}
          </button>
        </div>
      )}
    </div>
  );
}
