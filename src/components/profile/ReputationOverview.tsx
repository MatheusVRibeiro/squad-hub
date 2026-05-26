import { Award, Star, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Reputation } from "@/services/reputation";

export function ReputationOverview({ reputation }: { reputation: Reputation }) {
  const pct = Math.min(100, Math.round((reputation.xp / reputation.xpToNext) * 100));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="rounded-2xl border-border/60">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Nível
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl font-semibold tracking-tight">Nível {reputation.level}</p>
            <span className="text-xs text-muted-foreground">
              {reputation.xp}/{reputation.xpToNext} XP
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-primary" /> Reputação
          </div>
          <p className="text-2xl font-semibold tracking-tight">
            {reputation.rating.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ 5</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Baseado em {reputation.reviewsCount} avaliações
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4 text-primary" /> Projetos concluídos
          </div>
          <p className="text-2xl font-semibold tracking-tight">{reputation.projectsCompleted}</p>
          <p className="text-xs text-muted-foreground">
            {reputation.history.length} no histórico total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}