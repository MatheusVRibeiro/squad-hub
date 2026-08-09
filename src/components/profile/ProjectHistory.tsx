import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatarPeriodo } from "@/lib/periodo";
import type { HistoryEntry, MemberStatus } from "@/services/reputation";

function statusVariant(status: HistoryEntry["status"]) {
  if (status === "Concluído") return "default" as const;
  if (status === "Em andamento") return "secondary" as const;
  return "outline" as const;
}

/**
 * ETAPA 10 — badge do vínculo do usuário com o projeto. 'saiu'/'removido' não
 * apagam a participação: o projeto continua no histórico com o indicador.
 */
function memberStatusBadge(status: MemberStatus) {
  if (status === "saiu") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
      >
        Saiu
      </Badge>
    );
  }
  if (status === "removido") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
      >
        Removido
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
    >
      Participando
    </Badge>
  );
}

/** Linha "Participou como X" — função do squad quando o backend expõe; senão, papel. */
function participacaoLabel(h: HistoryEntry): string {
  if (h.funcao) return `Participou como ${h.funcao}`;
  return h.role === "Owner" ? "Participou como Owner" : "Participou como Membro";
}

export function ProjectHistory({ items }: { items: HistoryEntry[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum projeto no histórico ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold text-foreground">Histórico de participação</h2>
        <p className="text-xs text-muted-foreground">
          Sair de um projeto ou ser removido não apaga suas contribuições — todo projeto em que você
          participou permanece aqui.
        </p>
      </div>

      <div className="relative space-y-3 border-l border-border pl-5">
        {items.map((h) => (
          <div key={h.id} className="relative">
            <span className="absolute -left-[25.5px] top-4 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
            <Card className="rounded-2xl border-border/60 bg-card">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {h.projectName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {participacaoLabel(h)} · {formatarPeriodo(h.period)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {h.memberStatus !== "ativo" && memberStatusBadge(h.memberStatus)}
                    <Badge variant={statusVariant(h.status)} className="rounded-full text-[10px]">
                      {h.status}
                    </Badge>
                  </div>
                </div>
                {typeof h.tasksVerified === "number" && h.tasksVerified > 0 && (
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {h.tasksVerified}{" "}
                    {h.tasksVerified === 1 ? "tarefa verificada" : "tarefas verificadas"}
                  </p>
                )}
                {h.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {h.technologies.map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
