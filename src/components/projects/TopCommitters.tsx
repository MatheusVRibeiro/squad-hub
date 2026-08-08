import { useQuery } from "@tanstack/react-query";
import { Trophy, Loader2, Github, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectCommitters, getGlobalCommitters, type Committer } from "@/services/rankings";

type Props = {
  projectId?: string | number;
  scope?: "project" | "global";
  limit?: number;
  title?: string;
  period?: "all" | "month";
  showDisclaimer?: boolean;
};

const MEDALHAS = [Crown, Medal, Medal];

/**
 * Top Committers (ETAPAS 11-12).
 * scope="project" → ranking por projeto; scope="global" → ranking da plataforma.
 * Explica que quantidade ≠ qualidade.
 */
export function TopCommitters({
  projectId,
  scope = "project",
  limit = 5,
  title,
  period = "all",
  showDisclaimer = true,
}: Props) {
  const query = useQuery({
    queryKey:
      scope === "project"
        ? ["committers-project", String(projectId), limit]
        : ["committers-global", limit, period],
    queryFn: () =>
      scope === "project" && projectId != null
        ? getProjectCommitters(projectId, limit)
        : getGlobalCommitters(limit, period),
    enabled: scope === "global" || projectId != null,
  });

  const titulo = title ?? (scope === "project" ? "Top Committers" : "Top Committers da plataforma");

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Trophy className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-foreground">{titulo}</h3>
        {scope === "global" && period === "month" && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            mês
          </span>
        )}
      </div>

      {query.isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando ranking…
        </div>
      ) : query.isError ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {query.error instanceof Error
            ? query.error.message
            : "Não foi possível carregar o ranking."}
        </p>
      ) : !query.data || query.data.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhum commit registrado ainda. Vincule o projeto ao GitHub e comece a commitar em
          branches de tarefa!
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {query.data.map((c, i) => (
            <li key={c.userId ?? `anon-${i}`} className="flex items-center gap-3">
              <div className="w-5 text-center text-sm font-bold text-muted-foreground/70">
                {i + 1}.
              </div>
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt={c.name}
                  className="h-8 w-8 rounded-full border border-border/60 object-cover"
                />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Github className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground/90">
                  {c.name}
                  {c.githubLogin && c.githubLogin !== c.name && (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      @{c.githubLogin}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {c.commitCount} {c.commitCount === 1 ? "commit" : "commits"}
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

      {showDisclaimer && (
        <p className="mt-3 border-t border-border/20 pt-2 text-[10px] text-muted-foreground">
          ℹ️ Quantidade de commits não significa qualidade — avalie também PRs, revisões e XP
          acumulado.
        </p>
      )}
    </div>
  );
}
