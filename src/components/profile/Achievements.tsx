import { Code2, Flame, Rocket, Star, Trophy, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Achievement } from "@/services/reputation";

const ICONS = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  rocket: Rocket,
  users: Users,
  code: Code2,
} as const;

export function Achievements({ items }: { items: Achievement[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => {
        const Icon = ICONS[a.icon];
        return (
          <Card key={a.id} className="rounded-2xl border-border/60">
            <CardContent className="flex items-start gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}