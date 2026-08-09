import { Check, GitCommitHorizontal, GitPullRequest, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioContribuicao, PortfolioProjeto } from "@/services/portfolio";

function plural(n: number, singular: string, pluralWord: string): string {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}

/**
 * Linha de métrica do projeto (ex.: "4 tarefas verificadas"). Só renderiza
 * quando o valor é > 0 — zero não é evidência e polui o card.
 */
function Stat({ n, singular, pluralWord }: { n: number; singular: string; pluralWord: string }) {
  if (n <= 0) return null;
  return <span className="inline-flex items-center gap-1">{plural(n, singular, pluralWord)}</span>;
}

/** Detalhe individual da contribuição (ex.: "✓ API de autenticação — PR #15, 8 commits"). */
function Contribuicao({ item }: { item: PortfolioContribuicao }) {
  const titulo = item.titulo ?? "Contribuição";
  const temDetalhes = typeof item.prNumero === "number" || typeof item.commits === "number";

  return (
    <li className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-xs font-medium text-foreground">{titulo}</p>
        {temDetalhes && (
          <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
            {typeof item.prNumero === "number" && (
              <span className="inline-flex items-center gap-1">
                <GitPullRequest className="h-3 w-3" />
                PR #{item.prNumero} mergeado
              </span>
            )}
            {typeof item.commits === "number" && (
              <span className="inline-flex items-center gap-1">
                <GitCommitHorizontal className="h-3 w-3" />
                {plural(item.commits, "1 commit", "commits")}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

function Projeto({ projeto }: { projeto: PortfolioProjeto }) {
  const detalhesVisiveis =
    !projeto.privado &&
    (projeto.tasksVerificadas > 0 ||
      projeto.commits > 0 ||
      projeto.prsMergeados > 0 ||
      projeto.tecnologias.length > 0 ||
      projeto.contribuicoes.length > 0);

  return (
    <Card className="rounded-2xl border-border/60 bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{projeto.projetoNome}</p>
            <p className="text-xs text-muted-foreground">
              {projeto.funcao ? `Função: ${projeto.funcao}` : "Membro do squad"}
            </p>
          </div>
          {projeto.privado && (
            <Badge
              variant="outline"
              className="rounded-full border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
            >
              <Lock className="mr-1 h-3 w-3" />
              Privado
            </Badge>
          )}
        </div>

        {projeto.privado ? (
          // ETAPA 14 (futura): sem regra explícita de visibilidade, detalhes
          // técnicos não são expostos — apenas a confirmação genérica.
          <p className="flex items-center gap-1.5 rounded-xl border border-dashed border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Contribuição verificada em projeto privado
          </p>
        ) : (
          <>
            {detalhesVisiveis && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
                <Stat
                  n={projeto.tasksVerificadas}
                  singular="tarefa verificada"
                  pluralWord="tarefas verificadas"
                />
                <Stat n={projeto.commits} singular="commit" pluralWord="commits" />
                <Stat n={projeto.prsMergeados} singular="PR mergeado" pluralWord="PRs mergeados" />
              </div>
            )}

            {projeto.tecnologias.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {projeto.tecnologias.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {projeto.contribuicoes.length > 0 && (
              <ul className="space-y-1.5">
                {projeto.contribuicoes.map((c, i) => (
                  <Contribuicao key={c.titulo ?? i} item={c} />
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ETAPA 11 — "Contribuições verificadas": evidências GitHub por projeto
 * (tarefas verificadas, commits, PRs mergeados e tecnologias). Projetos
 * privados (ETAPA 14 futura) mostram apenas "Contribuição verificada em
 * projeto privado" — nunca detalhes técnicos sem regra de visibilidade.
 */
export function VerifiedContributions({ projetos }: { projetos: PortfolioProjeto[] }) {
  if (projetos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma contribuição verificada ainda. Entregas em squads com GitHub conectado aparecem
        aqui.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold text-foreground">Contribuições verificadas</h2>
        <p className="text-xs text-muted-foreground">
          Evidências de entrega por projeto: tarefas verificadas, commits e pull requests mergeados.
          Projetos privados aparecem sem detalhes técnicos.
        </p>
      </div>

      <div className="space-y-3">
        {projetos.map((p) => (
          <Projeto key={p.projetoId} projeto={p} />
        ))}
      </div>
    </div>
  );
}
