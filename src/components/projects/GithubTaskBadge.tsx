import { Github, GitCommitHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  branch: string | null | undefined;
  commitsCount: number | null | undefined;
  lastActivityAt: string | null | undefined;
  loading?: boolean;
};

function tempoRelativo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diffMin = Math.floor((Date.now() - t) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD} d`;
}

/**
 * Badge de integração GitHub no card da tarefa (ETAPA 8).
 * Mostra: GitHub ✓ · N commits · última atividade.
 */
export function GithubTaskBadge({ branch, commitsCount, lastActivityAt, loading }: Props) {
  if (!branch && !commitsCount && !loading) return null;

  const relativo = tempoRelativo(lastActivityAt);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide border",
        branch
          ? "bg-neutral-900/5 text-neutral-700 dark:bg-neutral-100/10 dark:text-neutral-200 border-border/60"
          : "bg-muted text-muted-foreground border-border/40",
      )}
      title={branch ? `Branch: ${branch}` : undefined}
    >
      <Github className="h-3 w-3 shrink-0" />
      {loading ? (
        <span className="text-muted-foreground">GitHub…</span>
      ) : (
        <>
          <span>GitHub ✓</span>
          {typeof commitsCount === "number" && commitsCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <GitCommitHorizontal className="h-3 w-3" />
              {commitsCount}
            </span>
          )}
          {relativo && <span className="text-muted-foreground">{relativo}</span>}
        </>
      )}
    </span>
  );
}
