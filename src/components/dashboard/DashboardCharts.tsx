import { lazy, Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ETAPA perf: recharts (~400KB) carregado SOB DEMANDA — não entra no bundle
// inicial do dashboard (primeira tela após login). Suspense mostra skeleton.
const Charts = lazy(() =>
  import("@/components/dashboard/Charts").then((m) => ({ default: m.Charts })),
);

export function DashboardCharts({
  projectStatusData,
  taskStatusData,
  tasksLoading,
  totalTasksCount,
}: {
  projectStatusData: { name: string; value: number; color: string }[];
  taskStatusData: { name: string; quantidade: number; fill: string }[];
  tasksLoading: boolean;
  totalTasksCount: number;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Status dos Squads</CardTitle>
              <CardDescription>Distribuição dos projetos na plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center">
              <Skeleton className="h-48 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Métricas das Tarefas</CardTitle>
              <CardDescription>Relação de status dos cartões nos Kanbans.</CardDescription>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center">
              <Skeleton className="h-48 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <Charts
        projectStatusData={projectStatusData}
        taskStatusData={taskStatusData}
        tasksLoading={tasksLoading}
        totalTasksCount={totalTasksCount}
      />
    </Suspense>
  );
}
