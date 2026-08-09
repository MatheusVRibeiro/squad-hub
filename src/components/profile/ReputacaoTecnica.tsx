import {
  CheckCircle2,
  FolderGit2,
  GitCommitHorizontal,
  GitPullRequest,
  Scale,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type ReputacaoTecnica as ReputacaoTecnicaData } from "@/services/reputacaoTecnica";

/**
 * ETAPA 12 — Card "Reputação técnica", visualmente separado do Nível/XP.
 *
 * Enquanto o XP mede ATIVIDADE/engajamento (concluir tasks, participar,
 * colaborar, receber avaliações), a reputação técnica mede EVIDÊNCIA de
 * entrega verificável (tarefas verificadas, PRs mergeados, commits válidos,
 * projetos com entrega). O score é calculado pelo backend — nunca pelo
 * frontend — e subir XP não altera automaticamente a reputação técnica.
 *
 * Diferenciação visual: acento esmeralda (confiança/evidência) em contraste
 * com o acento primário/âmbar usado nos cards de XP e avaliações.
 */
export function ReputacaoTecnica({ reputacao }: { reputacao: ReputacaoTecnicaData }) {
  const temEvidencia =
    reputacao.score > 0 ||
    reputacao.tasksVerificadas > 0 ||
    reputacao.prsMergeados > 0 ||
    reputacao.commitsValidos > 0 ||
    reputacao.projetosComEntrega > 0;

  // Score sem decimais quando inteiro ("100", "0"); com 1 casa quando decimal ("87.5").
  const scoreLabel = Number.isInteger(reputacao.score)
    ? String(reputacao.score)
    : reputacao.score.toFixed(1);

  // Barra de exibição normalizada (score > 100 trava em 100%).
  const pctBarra = Math.min(100, reputacao.score);

  const metricas = [
    { label: "Tarefas verificadas", value: reputacao.tasksVerificadas, icon: CheckCircle2 },
    { label: "PRs mergeados", value: reputacao.prsMergeados, icon: GitPullRequest },
    { label: "Commits válidos", value: reputacao.commitsValidos, icon: GitCommitHorizontal },
    { label: "Projetos com entrega", value: reputacao.projetosComEntrega, icon: FolderGit2 },
  ];

  return (
    <Card className="rounded-2xl border-emerald-500/20 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Cabeçalho: o que é e por que difere do XP */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-foreground">Reputação técnica</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Mede evidência de entrega verificável — diferente do XP, que mede atividade e
            engajamento. Subir XP não altera automaticamente sua reputação técnica.
          </p>
        </div>

        {/* Score */}
        <div className="flex items-center gap-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
          <div className="shrink-0 text-center">
            <p className="text-2xl leading-tight font-bold text-emerald-600 dark:text-emerald-400">
              {scoreLabel}
            </p>
            <p className="text-[10px] font-semibold tracking-wider text-emerald-700/70 uppercase dark:text-emerald-300/70">
              score técnico
            </p>
          </div>
          <div className="flex-1 space-y-1">
            <Progress value={pctBarra} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              Pontuação calculada pelo backend a partir de evidências verificadas.
            </p>
          </div>
        </div>

        {/* Métricas */}
        {temEvidencia ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metricas.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
              >
                <m.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-1 text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Sem evidências verificadas ainda
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Conclua tarefas, tenha PRs mergeados e commits vinculados a tasks MontesSquad para
              construir sua reputação técnica.
            </p>
          </div>
        )}

        {/* Legenda: XP ≠ Reputação técnica */}
        <div className="grid gap-2 text-[11px] sm:grid-cols-2">
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-2.5">
            <p className="flex items-center gap-1 font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> XP — Engajamento
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Atividade: concluir tasks, participar, colaborar e receber avaliações.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-2.5">
            <p className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Reputação — Evidência
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Entregas verificáveis: tarefas verificadas, PRs mergeados e commits válidos.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
