import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Compass,
  FolderKanban,
  Settings,
  User,
  Trophy,
  CheckSquare,
  Bell,
  Sparkles,
} from "lucide-react";
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

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TopCommitters } from "@/components/projects/TopCommitters";
import { TopContributors } from "@/components/projects/TopContributors";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects } from "@/services/projects";
import { fetchReputation } from "@/services/reputation";
import { fetchNotifications } from "@/services/notifications";
import { fetchProjectTasks } from "@/services/tasks";

const tiles = [
  { icon: Compass, label: "Explorar Projetos", hint: "Descubra squads", to: "/projetos" },
  { icon: FolderKanban, label: "Meus Projetos", hint: "Gerencie squads", to: "/meus-projetos" },
  { icon: User, label: "Meu Perfil", hint: "Reputação e skills", to: "/perfil" },
  { icon: Settings, label: "Configurações", hint: "Ajustes da conta", to: "/configuracoes" },
] as const;

function DashboardPage() {
  const { user } = useAuth();

  // Queries para dados agregados em tempo real
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const { data: reputation } = useQuery({
    queryKey: ["reputation", user?.id || user?.email],
    queryFn: () => fetchReputation(user?.id),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  // 1. Dados para o gráfico de Pizza: Status dos Projetos (GET /projetos real)
  const projectStatusData = useMemo(() => {
    const counts = { Aberto: 0, "Em andamento": 0, Finalizado: 0 };
    projects.forEach((p) => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return [
      { name: "Aberto", value: counts["Aberto"], color: "#6366f1" },
      { name: "Em progresso", value: counts["Em andamento"], color: "#f59e0b" },
      { name: "Finalizado", value: counts["Finalizado"], color: "#10b981" },
    ].filter((item) => item.value > 0);
  }, [projects]);

  // 2. Projetos em que o usuário é membro/dono — vindos do histórico real de
  // reputação (GET /usuarios/me/reputacao → history, baseado em membros_equipe).
  const myProjectIds = useMemo(() => {
    if (!reputation) return [];
    return Array.from(new Set((reputation.history ?? []).map((h) => String(h.id)).filter(Boolean)));
  }, [reputation]);

  // 3. Tarefas reais de cada squad do usuário (GET /projetos/:id/tarefas)
  const taskQueries = useQueries({
    queries: myProjectIds.map((id) => ({
      queryKey: ["project-tasks", id],
      queryFn: () => fetchProjectTasks(id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const taskStatusData = useMemo(() => {
    let todo = 0;
    let doing = 0;
    let done = 0;

    for (const query of taskQueries) {
      for (const task of query.data ?? []) {
        if (task.status === "todo") todo++;
        else if (task.status === "doing") doing++;
        else if (task.status === "done") done++;
      }
    }

    return [
      { name: "A fazer", quantidade: todo, fill: "#94a3b8" },
      { name: "Em progresso", quantidade: doing, fill: "#f59e0b" },
      { name: "Concluído", quantidade: done, fill: "#10b981" },
    ];
  }, [taskQueries]);

  const totalTasksCount = useMemo(() => {
    return taskStatusData.reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [taskStatusData]);

  const completedTasksCount = useMemo(() => {
    return taskStatusData.find((t) => t.name === "Concluído")?.quantidade || 0;
  }, [taskStatusData]);

  const tasksLoading = taskQueries.some((q) => q.isPending);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const xpProgressPercent = useMemo(() => {
    if (!reputation) return 0;
    if (reputation.xpToNext <= 0) return 0;
    return (reputation.xp / reputation.xpToNext) * 100;
  }, [reputation]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Header com Boas-vindas e Nível de XP */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Workspace do Desenvolvedor</p>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Olá, {user?.name?.split(" ")[0] ?? "dev"} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Aqui está o panorama geral das suas atividades e squads no MonteSquad.
              </p>
            </div>

            {/* Card de Nível e XP */}
            <Card className="w-full rounded-2xl border-border/60 bg-gradient-to-br from-primary/5 via-card to-card md:max-w-xs">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">Nível Atual</p>
                      <p className="text-sm font-semibold">Level {reputation?.level || 1}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {reputation?.xp || 0} / {reputation?.xpToNext || 1000} XP
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress value={xpProgressPercent} className="h-2" />
                  <p className="text-[10px] text-right text-muted-foreground">
                    Faltam {reputation ? Math.max(0, reputation.xpToNext - reputation.xp) : 0} XP
                    para o próximo nível
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="flex items-center gap-4 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FolderKanban className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total de Projetos</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="flex items-center gap-4 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckSquare className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tarefas Entregues</p>
                  <p className="text-2xl font-bold">
                    {completedTasksCount}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {totalTasksCount}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="flex items-center gap-4 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Bell className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Avisos Pendentes</p>
                  <p className="text-2xl font-bold">{unreadNotifCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="flex items-center gap-4 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Conquistas Ganhas</p>
                  <p className="text-2xl font-bold">{reputation?.achievements.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção de Gráficos Recharts */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Gráfico 1: Evolução Semanal de Atividade / XP — estado vazio (sem fonte real) */}
            <Card className="rounded-2xl border-border/60 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Progresso Semanal (XP)</CardTitle>
                <CardDescription>Evolução do XP acumulado ao longo da semana.</CardDescription>
              </CardHeader>
              <CardContent className="flex h-72 flex-col items-center justify-center gap-3 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Trophy className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium">Sem dados semanais disponíveis</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Ainda não há histórico diário de XP. Complete tarefas e participe de squads para
                  acumular XP.
                </p>
                {reputation && (
                  <p className="text-xs text-muted-foreground">
                    XP atual:{" "}
                    <span className="font-semibold text-foreground">
                      {reputation.xp} / {reputation.xpToNext}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 2: Projetos por Status */}
            <Card className="rounded-2xl border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Status dos Squads</CardTitle>
                <CardDescription>Distribuição dos projetos na plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="flex h-72 flex-col justify-center">
                {projectStatusData.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Nenhum projeto registrado.
                  </p>
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

            {/* Gráfico 3: Tarefas por Status (dados reais dos kanbans do usuário) */}
            <Card className="rounded-2xl border-border/60 md:col-span-3">
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
                      <CheckSquare className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-medium">Nenhuma tarefa nos seus squads</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Crie tarefas no Kanban dos seus projetos para acompanhar as métricas aqui.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskStatusData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
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

          {/* Rankings da plataforma (ETAPAS 12 e 14) */}
          <div className="grid gap-6 md:grid-cols-2">
            <TopContributors
              scope="global"
              limit={5}
              period="all"
              title="Top Contributors da plataforma"
            />
            <TopCommitters
              scope="global"
              limit={5}
              period="all"
              title="Top Committers da plataforma"
            />
          </div>

          {/* Atalhos Rápidos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Atalhos da Plataforma
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((tile, i) => (
                <motion.div
                  key={tile.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                >
                  <Link to={tile.to} className="block">
                    <Card className="group h-full cursor-pointer rounded-2xl border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                      <CardContent className="flex items-start gap-4 p-6">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <tile.icon className="h-5 w-5" />
                        </span>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{tile.label}</p>
                          <p className="text-xs text-muted-foreground">{tile.hint}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
