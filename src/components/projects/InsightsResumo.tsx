import { useMemo } from "react";
import { BarChart3, CheckCircle2, GitCommitHorizontal, GitPullRequest, Users } from "lucide-react";
import type { KanbanTask } from "@/services/projectDetail";

type Props = {
  tasks: KanbanTask[];
};

type ResumoMetricas = {
  tasksVerificadas: number;
  prsMergeados: number;
  commits: number;
  contribuidores: number;
};

/**
 * Calcula o resumo do projeto a partir das tarefas JÁ carregadas no detalhe
 * (GET /projetos/:id) — zero queries novas. Semânticas alinhadas ao backend:
 * - Task verificada = concluída via merge GitHub (`concluida_via='github_merge'`).
 * - PR mergeado = PR da task em estado 'merged' (o merge GitHub também marca
 *   `github_pr_status='merged'` + `concluida_via='github_merge'` juntos).
 * - Commits = soma de `githubCommitsCount` por tarefa (campo do contrato).
 * - Contribuidores = responsáveis distintos de tarefas com evidência GitHub.
 */
function calcularResumo(tasks: KanbanTask[]): ResumoMetricas {
  let tasksVerificadas = 0;
  let prsMergeados = 0;
  let commits = 0;
  const contribuidores = new Set<string>();

  for (const t of tasks) {
    const mergeado = t.completionSource === "github_merge" || t.githubPrStatus === "merged";
    const temEvidenciaGithub =
      mergeado ||
      Boolean(t.githubBranch) ||
      Boolean(t.githubPrNumber) ||
      (typeof t.githubCommitsCount === "number" && t.githubCommitsCount > 0);

    if (t.completionSource === "github_merge") tasksVerificadas += 1;
    if (mergeado) prsMergeados += 1;
    if (typeof t.githubCommitsCount === "number" && t.githubCommitsCount > 0) {
      commits += t.githubCommitsCount;
    }
    if (temEvidenciaGithub && (t.assigneeId != null || t.assignee)) {
      contribuidores.add(t.assigneeId != null ? `id:${t.assigneeId}` : `nome:${t.assignee}`);
    }
  }

  return { tasksVerificadas, prsMergeados, commits, contribuidores: contribuidores.size };
}

const CARDS = [
  {
    key: "tasksVerificadas" as const,
    label: "Tasks verificadas",
    hint: "concluídas via merge",
    icon: CheckCircle2,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "prsMergeados" as const,
    label: "PRs mergeados",
    hint: "pull requests aceitos",
    icon: GitPullRequest,
    iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    key: "commits" as const,
    label: "Commits",
    hint: "nas branches das tasks",
    icon: GitCommitHorizontal,
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    key: "contribuidores" as const,
    label: "Contribuidores",
    hint: "com atividade no GitHub",
    icon: Users,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
] as const;

/**
 * Insights — Resumo (ETAPA 12): métricas do projeto acima dos rankings.
 * Layout: grid responsivo 2x2 (mobile) / 4 em linha (desktop), cards compactos.
 * Empty state: quando não há NENHUMA métrica, renderiza UMA linha compacta
 * (altura reduzida) em vez de 4 cards gigantes com zeros/frase solta.
 */
export function InsightsResumo({ tasks }: Props) {
  const metricas = useMemo(() => calcularResumo(tasks), [tasks]);
  const temDados =
    metricas.tasksVerificadas > 0 ||
    metricas.prsMergeados > 0 ||
    metricas.commits > 0 ||
    metricas.contribuidores > 0;

  if (!temDados) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border/60 bg-card/60 px-4 py-2.5 shadow-sm">
        <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Sem métricas do GitHub ainda. Vincule o repositório e conclua tarefas com merge de PR para
          gerar o resumo do squad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Resumo</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARDS.map(({ key, label, hint, icon: Icon, iconClass }) => (
          <div
            key={key}
            className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4"
          >
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${iconClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2.5 text-2xl font-extrabold leading-none tracking-tight text-foreground">
              {metricas[key]}
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-foreground/80">{label}</p>
            <p className="text-[10px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
