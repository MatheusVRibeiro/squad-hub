import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReChartsTooltip,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ETAPA perf: este módulo contém recharts (~400KB) e só é carregado sob
// demanda (lazy) quando o dashboard monta — não polui o bundle inicial.

export function Charts({
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
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Status dos Squads</CardTitle>
          <CardDescription>Distribuição dos projetos na plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-72 flex-col justify-center">
          {projectStatusData.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Nenhum projeto registrado.</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReChartsTooltip
                      contentStyle={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legenda customizada */}
              <div className="mt-4 flex justify-center gap-4 text-xs">
                {projectStatusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium text-muted-foreground">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Métricas das Tarefas</CardTitle>
          <CardDescription>
            Relação de status de todos os cartões nos Kanbans dos seus squads.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {tasksLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-muted-foreground">Carregando tarefas...</p>
            </div>
          ) : totalTasksCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              <p className="text-sm font-medium">Nenhuma tarefa nos seus squads</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Crie tarefas no Kanban dos seus projetos para acompanhar as métricas aqui.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="oklch(0.554 0.046 257.417)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="oklch(0.554 0.046 257.417)" fontSize={11} tickLine={false} />
                <ReChartsTooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="quantidade" name="Quantidade de tarefas" radius={[6, 6, 0, 0]}>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
