import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lightbulb, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRecomendacoes, type RecomendacaoProjeto } from "@/services/matching";

/** Rótulos pt-BR para as chaves de fator conhecidas do backend. */
const FATOR_LABELS: Record<string, string> = {
  habilidades: "Habilidades",
  funcao: "Função",
  nivel: "Nível",
  disponibilidade: "Disponibilidade",
  outras: "Outros",
};

function compatibilidade(rec: RecomendacaoProjeto): number {
  return Math.min(100, Math.max(0, rec.score));
}

/** Lista legível de fatores: usa explicacao[] quando vier; senão deriva de fatores. */
function itensExplicacao(rec: RecomendacaoProjeto): string[] {
  const explicacoes = rec.explicacao ?? [];
  if (explicacoes.length > 0) return explicacoes;
  return Object.entries(rec.fatores ?? {}).map(([chave, fator]) => {
    const label = fator?.label ?? FATOR_LABELS[chave] ?? chave;
    return fator?.percentual != null ? `${label} ${Math.round(fator.percentual)}%` : label;
  });
}

function RecomendacaoCard({ rec }: { rec: RecomendacaoProjeto }) {
  const score = compatibilidade(rec);
  const itens = itensExplicacao(rec);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <Link
          to="/projetos/$id"
          params={{ id: String(rec.projetoId) }}
          className="min-w-0 text-sm font-bold text-foreground/90 transition-colors hover:text-primary"
        >
          <span className="line-clamp-2">{rec.titulo}</span>
        </Link>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
          {Math.round(score)}%
        </span>
      </div>

      {rec.descricao && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{rec.descricao}</p>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Compatibilidade</span>
          <span className="font-semibold text-foreground/80">{Math.round(score)}%</span>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>

      {rec.tecnologias && rec.tecnologias.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rec.tecnologias.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] font-medium">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {itens.length > 0 && (
        <ul className="mt-auto space-y-1 border-t border-border/20 pt-2">
          {itens.slice(0, 4).map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/**
 * Recomendados para você (ETAPA 16) — projetos com maior compatibilidade com o
 * perfil técnico do desenvolvedor autenticado (GET /matching/projetos).
 */
export function RecomendadosParaVoce() {
  const query = useQuery({
    queryKey: ["matching-recomendacoes"],
    queryFn: fetchRecomendacoes,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Recomendados para você</h2>
          <p className="text-xs text-muted-foreground">
            Projetos com maior compatibilidade com o seu perfil técnico.
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
              <div className="mt-3 flex gap-1.5">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-xs text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Não foi possível carregar suas recomendações."}
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
          <p className="text-sm font-medium">Complete seu perfil para receber recomendações</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Adicione suas habilidades técnicas, nível de experiência e disponibilidade para
            encontrarmos os projetos mais compatíveis com você.
          </p>
          <Link
            to="/perfil"
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/80"
          >
            Completar meu perfil
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((rec, i) => (
            <RecomendacaoCard key={`${rec.projetoId}-${i}`} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
