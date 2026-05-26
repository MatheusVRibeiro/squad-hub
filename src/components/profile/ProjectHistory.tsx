import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HistoryEntry } from "@/services/reputation";

function statusVariant(status: HistoryEntry["status"]) {
  if (status === "Concluído") return "default" as const;
  if (status === "Em andamento") return "secondary" as const;
  return "outline" as const;
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
    <div className="relative space-y-3 border-l border-border/70 pl-5">
      {items.map((h) => (
        <div key={h.id} className="relative">
          <span className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
          <Card className="rounded-2xl border-border/60">
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{h.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.role} · {h.period}
                  </p>
                </div>
                <Badge variant={statusVariant(h.status)} className="rounded-full text-[10px]">
                  {h.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.technologies.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}