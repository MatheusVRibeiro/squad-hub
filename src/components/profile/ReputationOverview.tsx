import { Award, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Reputation } from "@/services/reputation";

export function ReputationOverview({ reputation }: { reputation: Reputation }) {
  const pct = Math.min(100, Math.round((reputation.xp / reputation.xpToNext) * 100));

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* CARD NIVEL */}
      <Card className="rounded-2xl border-border/60 bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-primary" /> Nível
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-xl font-bold text-foreground">Level {reputation.level}</p>
            <span className="text-xs text-muted-foreground">
              {reputation.xp} / {reputation.xpToNext} XP
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      {/* CARD REPUTACAO */}
      <Card className="rounded-2xl border-border/60 bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Star className="h-4 w-4 text-amber-500" /> Reputação
          </div>
          <p className="text-xl font-bold text-foreground">
            {reputation.rating.toFixed(1)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/ 5.0</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Média obtida de {reputation.reviewsCount} avaliações
          </p>
        </CardContent>
      </Card>

      {/* CARD PROJETOS */}
      <Card className="rounded-2xl border-border/60 bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Award className="h-4 w-4 text-primary" /> Projetos Concluídos
          </div>
          <p className="text-xl font-bold text-foreground">{reputation.projectsCompleted}</p>
          <p className="text-xs text-muted-foreground">
            {reputation.history.length} no histórico total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
