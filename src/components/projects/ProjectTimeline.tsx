import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  GitCommitHorizontal,
  GitPullRequest,
  PlusCircle,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchEventosProjeto } from "@/services/eventos";

type Props = {
  projectId: string | number;
};

/** Ícone por tipo de evento (ETAPA 15) — fallback Activity para tipos desconhecidos. */
const ICONS: Record<string, typeof Activity> = {
  membro_entrou: UserPlus,
  membro_saiu: UserMinus,
  task_criada: PlusCircle,
  task_assumida: UserCheck,
  task_abandonada: UserX,
  commit_detectado: GitCommitHorizontal,
  pr_aberto: GitPullRequest,
  pr_mergeado: GitPullRequest,
  task_concluida: CheckCircle2,
  reavaliacao: RefreshCw,
};

/**
 * Tempo relativo em pt-BR ("há 5 min", "há 2 dias") via Intl.RelativeTimeFormat.
 * Data inválida ou falha do Intl → fallback para a string absoluta original.
 */
function formatTempoRelativo(iso?: string): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  try {
    const diffMs = Date.now() - data.getTime();
    const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
    const minutos = Math.round(diffMs / 60_000);
    if (Math.abs(minutos) < 60) return rtf.format(-minutos, "minute");
    const horas = Math.round(minutos / 60);
    if (Math.abs(horas) < 24) return rtf.format(-horas, "hour");
    const dias = Math.round(horas / 24);
    if (Math.abs(dias) < 30) return rtf.format(-dias, "day");
    const meses = Math.round(dias / 30);
    if (Math.abs(meses) < 12) return rtf.format(-meses, "month");
    return rtf.format(-Math.round(meses / 12), "year");
  } catch {
    return data.toLocaleDateString("pt-BR");
  }
}

/**
 * Timeline de atividade do projeto (ETAPA 15).
 * GET /projetos/:projetoId/eventos — exige ser membro ou dono do projeto
 * (a aba é renderizada apenas para membros na tela de detalhe).
 */
export function ProjectTimeline({ projectId }: Props) {
  const query = useQuery({
    queryKey: ["eventos", String(projectId)],
    queryFn: () => fetchEventosProjeto(projectId),
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Activity className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Atividade do projeto</h3>
      </div>

      {query.isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5">
          <p className="text-xs text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Não foi possível carregar a atividade do projeto."}
          </p>
          <button
            onClick={() => query.refetch()}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-medium text-foreground/80 hover:bg-muted"
          >
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="mt-4 space-y-1">
          {query.data.map((evento, i) => {
            const Icone = ICONS[evento.tipo] ?? Activity;
            return (
              <li
                key={`${evento.id}-${i}`}
                className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground/90">{evento.titulo}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {evento.usuarioNome ? `${evento.usuarioNome} · ` : ""}
                    {formatTempoRelativo(evento.criadoEm)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
