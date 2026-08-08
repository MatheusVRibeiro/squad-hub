import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Loader2,
  Github,
  Crown,
  Medal,
  GitPullRequest,
  GitCommitHorizontal,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectContributors,
  getGlobalContributors,
  type Contributor,
} from "@/services/rankings";

type Props = {
  projectId?: string | number;
  scope?: "project" | "global";
  limit?: number;
  title?: string;
  period?: "all" | "month";
};

const MEDALHAS = [Crown, Medal, Medal];

/**
 * Top Contributors (ETAPAS 13-14) — ranking principal por QUALIDADE (score),
 * não por volume de commits. Mostra o detalhamento ao lado.
 */
export function TopContributors({
  projectId,
  scope = "project",
  limit = 10,
  title,
  period = "all",
}: Props) {
  const query = useQuery({
    queryKey:
      scope === "project"
        ? ["contributors-project", String(projectId), limit]
        : ["contributors-global", limit, period],
    queryFn: () =>
      scope === "project" && projectId != null
        ? getProjectContributors(projectId, limit)
        : getGlobalContributors(limit, period),
    enabled: scope === "global" || projectId != null,
  });

  const titulo =
    title ?? (scope === "project" ? "Top Contributors" : "Top Contributors da plataforma");

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/5 via-card to-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Trophy className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-foreground">{titulo}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          por qualidade
        </span>
      </div>

      {query.isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando ranking…
        </div>
      ) : query.isError ? (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">
            {query.error instanceof Error
              ? query.error.message
              : "Não foi possível carregar o ranking."}
          </p>
          <button
            onClick={() => query.refetch()}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-medium text-foreground/80 hover:bg-muted cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma contribuição verificada ainda. Entregue tarefas com merge de PR para pontuar!
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {query.data.map((c, i) => (
            <li key={c.userId ?? `anon-${i}`} className="flex items-center gap-3">
              <div className="w-6 text-center text-base font-extrabold text-muted-foreground/70">
                {i + 1}
              </div>
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt={c.name}
                  className="h-9 w-9 rounded-full border border-border/60 object-cover"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Github className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-xs font-bold text-foreground/90">{c.name}</p>
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                    {c.score} pts
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {c.tasksVerificadas > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {c.tasksVerificadas}{" "}
                      verificadas
                    </span>
                  )}
                  {c.prsMergeados > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <GitPullRequest className="h-3 w-3" /> {c.prsMergeados} merged
                    </span>
                  )}
                  {c.prsAbertos > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <GitPullRequest className="h-3 w-3 text-sky-500" /> {c.prsAbertos} abertos
                    </span>
                  )}
                  {c.commitCount > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <GitCommitHorizontal className="h-3 w-3" /> {c.commitCount} commits
                    </span>
                  )}
                </p>
              </div>
              {i < 3 &&
                (() => {
                  const Medalha = MEDALHAS[i];
                  return (
                    <Medalha
                      className={cn(
                        "h-4 w-4",
                        i === 0 ? "text-amber-500" : "text-muted-foreground/60",
                      )}
                    />
                  );
                })()}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-border/20 pt-2 text-[10px] text-muted-foreground">
        🏆 Score = commits úteis (limitados por tarefa) + PRs abertos (10) + PRs mergeados (30) +
        tarefas verificadas pelo GitHub (50). Entregas valem mais que microcommits.
      </p>
    </div>
  );
}
