import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Review } from "@/services/reputation";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fromNow(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 86400) return "hoje";
  const days = Math.floor(d / 86400);
  if (days < 30) return `${days} d atrás`;
  const months = Math.floor(days / 30);
  return `${months} mês${months > 1 ? "es" : ""} atrás`;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export function Reviews({ items }: { items: Review[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Ainda sem avaliações.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <Card key={r.id} className="rounded-2xl border-border/60 bg-card">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9 border border-border/60">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials(r.author)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.author}</p>
                    <p className="text-[11px] text-muted-foreground">
                      em {r.projectName} · {fromNow(r.createdAt)}
                    </p>
                  </div>
                  <Stars value={r.rating} />
                </div>
              </div>
            </div>
            <p className="pl-12 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
