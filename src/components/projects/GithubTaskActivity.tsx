import { useQuery } from "@tanstack/react-query";
import {
  Github,
  GitCommitHorizontal,
  ExternalLink,
  Loader2,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTaskGithubStatus,
  getTaskCommits,
  getTaskTimeline,
  type TaskGithubStatus,
  type TaskCommit,
} from "@/services/github";

type Props = {
  projectId: string | number;
  taskId: string | number;
  open: boolean;
};

/**
 * Painel de atividade GitHub da tarefa (ETAPA 8) — usado no modal da tarefa.
 * Polling 15s contra a API MontesSquad (nunca contra o GitHub).
 */
export function GithubTaskActivity({ projectId, taskId, open }: Props) {
  const statusQuery = useQuery({
    queryKey: ["task-github-status", String(projectId), String(taskId)],
    queryFn: () => getTaskGithubStatus(projectId, taskId),
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const commitsQuery = useQuery({
    queryKey: ["task-commits", String(projectId), String(taskId)],
    queryFn: () => getTaskCommits(projectId, taskId),
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  if (!open) return null;

  const status: TaskGithubStatus | undefined = statusQuery.data;
  const commits: TaskCommit[] | undefined = commitsQuery.data;

  const temGitHub =
    status?.github_branch || status?.github_pr_number || (commits && commits.length > 0);

  return (
    <div className="space-y-3 border-t border-border/20 pt-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-900/5 text-neutral-700 dark:bg-neutral-100/10 dark:text-neutral-100">
          <Github className="h-4 w-4" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Atividade GitHub
        </p>
      </div>

      {statusQuery.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
        </div>
      ) : !temGitHub ? (
        <p className="text-xs text-muted-foreground">
          Esta tarefa ainda não possui atividade GitHub vinculada. Assuma a tarefa para gerar uma
          branch e começar a trabalhar.
        </p>
      ) : (
        <div className="space-y-3">
          {status?.github_branch && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <code className="font-mono text-foreground/80">{status.github_branch}</code>
              {status.github_pr_url && (
                <a
                  href={status.github_pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                >
                  PR #{status.github_pr_number} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Status do PR (ETAPA 9) */}
          {status?.github_pr_status && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium",
                status.github_pr_status === "merged" || status.completion_source === "github_merge"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : status.github_pr_status === "open"
                    ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20"
                    : "bg-muted/50 text-muted-foreground border border-border/40",
              )}
            >
              {status.github_pr_status === "merged" ||
              status.completion_source === "github_merge" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {status.github_pr_number
                    ? `PR #${status.github_pr_number} mergeado — conclusão verificada pelo GitHub ✓`
                    : "Conclusão verificada pelo GitHub ✓"}
                </>
              ) : status.github_pr_status === "open" ? (
                <>
                  <GitPullRequest className="h-3.5 w-3.5" />
                  {status.github_pr_number
                    ? `PR #${status.github_pr_number} aberto — tarefa em revisão`
                    : "Pull request aberto — tarefa em revisão"}
                </>
              ) : (
                <>
                  <GitPullRequest className="h-3.5 w-3.5" />
                  {status.github_pr_number
                    ? `PR #${status.github_pr_number} fechado sem merge — tarefa voltou para Em progresso`
                    : "PR fechado sem merge"}
                </>
              )}
            </div>
          )}

          {commitsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando commits…
            </div>
          ) : !commits || commits.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum commit registrado ainda nesta branch.
            </p>
          ) : (
            <ul className="space-y-2">
              {commits.map((c) => (
                <li key={c.sha} className="rounded-lg border border-border/40 bg-card px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-xs font-medium text-foreground/90">
                      {c.mensagem}
                    </p>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono">
                      <GitCommitHorizontal className="h-3 w-3" />
                      {c.sha_curto || String(c.sha).slice(0, 7)}
                    </span>
                    <span>{c.autor}</span>
                    {c.commit_em && (
                      <span className={cn("ml-auto")}>
                        {new Date(c.commit_em).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Timeline técnica (ETAPA 15) */}
      <TimelineBlock projectId={projectId} taskId={taskId} open={open} />
    </div>
  );
}

function TimelineBlock({
  projectId,
  taskId,
  open,
}: {
  projectId: string | number;
  taskId: string | number;
  open: boolean;
}) {
  const timelineQuery = useQuery({
    queryKey: ["task-timeline", String(projectId), String(taskId)],
    queryFn: () => getTaskTimeline(projectId, taskId),
    enabled: open,
    refetchInterval: open ? 30000 : false,
  });

  const eventos = timelineQuery.data ?? [];
  if (timelineQuery.isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando timeline…
      </div>
    );
  }
  if (eventos.length === 0) return null;

  const iconeTipo: Record<string, typeof History> = {
    assumida: History,
    branch: GitBranch,
    commit: GitCommitHorizontal,
    pr_open: GitPullRequest,
    pr_closed: GitPullRequest,
    pr_merged: GitPullRequest,
    concluida: CheckCircle2,
  };

  return (
    <div className="mt-4 border-t border-border/20 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <History className="h-3 w-3" /> Timeline
      </p>
      <ol className="relative ml-2 space-y-2.5 border-l border-border/40 pl-4">
        {eventos.map((ev, i) => {
          const Icone = iconeTipo[ev.tipo] ?? History;
          return (
            <li key={`${ev.tipo}-${i}`} className="relative">
              <span className="absolute -left-[21px] grid h-4 w-4 place-items-center rounded-full bg-background border border-border/50">
                <Icone
                  className={cn(
                    "h-2.5 w-2.5",
                    ev.tipo === "pr_merged" || ev.tipo === "concluida"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                />
              </span>
              <p className="text-xs font-medium text-foreground/90">{ev.titulo}</p>
              {ev.detalhe && (
                <p className="truncate text-[10px] text-muted-foreground">{ev.detalhe}</p>
              )}
              {ev.sha && (
                <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">{ev.sha}</code>
              )}
              {ev.url ? (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                >
                  ver <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : null}
              {ev.quando && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(ev.quando).toLocaleString("pt-BR")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
