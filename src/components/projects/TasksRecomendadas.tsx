import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Hand, Lightbulb, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// Reutiliza o fluxo EXISTENTE de assumir task (mesmo usado pelo Kanban) —
// POST /projetos/:id/tarefas/:taskId/assumir. NÃO duplicar lógica.
import { claimTask } from "@/services/projectDetail";
import { notificationsIntegration } from "@/services/notificationsIntegration";
import { fetchTasksRecomendadas, type TaskRecomendada } from "@/services/taskMatching";

function compatibilidade(task: TaskRecomendada): number {
  return Math.min(100, Math.max(0, task.compatibilidade));
}

function TaskRecomendadaCard({
  task,
  claimingId,
  onClaim,
}: {
  task: TaskRecomendada;
  claimingId: string | number | null;
  onClaim: (task: TaskRecomendada) => void;
}) {
  const score = compatibilidade(task);
  const claiming = claimingId != null && String(claimingId) === String(task.taskId);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 min-w-0 text-sm font-bold text-foreground/90">{task.titulo}</h3>
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
          {Math.round(score)}%
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Compatibilidade</span>
        <span className="font-semibold text-foreground/80">{Math.round(score)}%</span>
      </div>

      {task.motivos.length > 0 && (
        <ul className="mt-auto space-y-1 border-t border-border/20 pt-2">
          {task.motivos.slice(0, 4).map((motivo, i) => (
            <li
              key={`${motivo}-${i}`}
              className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <span>{motivo}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ETAPA 17: matching é RECOMENDAÇÃO, não autorização — o botão Assumir
          nunca some/bloqueia por score baixo; o backend decide quem pode
          assumir a task. */}
      <Button
        size="sm"
        className="mt-auto w-full rounded-xl"
        disabled={claiming}
        onClick={() => onClaim(task)}
      >
        {claiming ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Assumindo...
          </>
        ) : (
          <>
            <Hand className="mr-1.5 h-3.5 w-3.5" /> Assumir
          </>
        )}
      </Button>
    </article>
  );
}

/**
 * Tasks recomendadas para você (ETAPA 17) — tasks do projeto com maior
 * compatibilidade com o perfil técnico do desenvolvedor autenticado
 * (GET /projetos/:projetoId/tasks/recomendadas, exige ser membro/dono).
 */
export function TasksRecomendadas({
  projetoId,
  projectName,
}: {
  projetoId: string | number;
  projectName?: string;
}) {
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | number | null>(null);

  const query = useQuery({
    queryKey: ["tasks-recomendadas", String(projetoId)],
    queryFn: () => fetchTasksRecomendadas(projetoId),
  });

  const claimMutation = useMutation({
    mutationFn: (task: TaskRecomendada) => claimTask(projetoId, task.taskId),
    onMutate: (task) => {
      setClaimingId(task.taskId);
    },
    onSuccess: (_updated, task) => {
      toast.success("Tarefa assumida! Status: Em progresso");
      notificationsIntegration.notifyTaskActivity(
        projectName || "Projeto",
        task.titulo,
        "assigned",
        "Você",
        String(projetoId),
      );
      // Atualiza o cache: Kanban (project detail) + lista de recomendadas.
      queryClient.invalidateQueries({ queryKey: ["project", String(projetoId)] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({
        queryKey: ["tasks-recomendadas", String(projetoId)],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao assumir tarefa");
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Tasks recomendadas para você</h2>
          <p className="text-xs text-muted-foreground">
            Tasks do projeto com maior compatibilidade com o seu perfil técnico.
          </p>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-4/5" />
              <Skeleton className="mt-4 h-2 w-full" />
              <Skeleton className="mt-3 h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-xs text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Não foi possível carregar as tasks recomendadas."}
          </p>
          <button
            onClick={() => query.refetch()}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-medium text-foreground/80 hover:bg-muted"
          >
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium">Nenhuma task recomendada no momento</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Quando houver tasks compatíveis com o seu perfil técnico neste projeto, elas aparecerão
            aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((task, i) => (
            <TaskRecomendadaCard
              key={`${task.taskId}-${i}`}
              task={task}
              claimingId={claimingId}
              onClaim={(t) => claimMutation.mutate(t)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
