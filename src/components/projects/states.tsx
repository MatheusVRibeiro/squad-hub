import { AlertTriangle, Compass, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-border/60">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProjectsEmpty({ onReset }: { onReset?: () => void }) {
  return (
    <Card className="rounded-2xl border-dashed bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold">Nenhum projeto encontrado</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tente ajustar os filtros ou limpar a busca para ver mais squads.
        </p>
        {onReset && (
          <Button variant="outline" size="sm" onClick={onReset} className="rounded-xl">
            Limpar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold">Não foi possível carregar os projetos</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Verifique sua conexão com o backend em <code>http://localhost:3333</code> e tente
          novamente.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
