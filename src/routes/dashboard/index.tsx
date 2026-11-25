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
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RecomendadosParaVoce } from "@/components/projects/RecomendadosParaVoce";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects } from "@/services/projects";
import { fetchReputation } from "@/services/reputation";
import { fetchNotifications } from "@/services/notifications";
import { fetchProjectTasks, type KanbanTask } from "@/services/tasks";

const tiles = [
  { icon: Compass, label: "Explorar Projetos", hint: "Descubra squads", to: "/projetos" },
  { icon: FolderKanban, label: "Meus Projetos", hint: "Gerencie squads", to: "/meus-projetos" },
  { icon: User, label: "Meu Perfil", hint: "Reputação e skills", to: "/perfil" },
  { icon: Settings, label: "Configurações", hint: "Ajustes da conta", to: "/configuracoes" },
] as const;

function DashboardPage() {
  const { user } = useAuth();

  // Queries para dados agregados em tempo real — M1: falha de query NUNCA vira
  // valor falso ('Level 1'/'0 projetos'/XP 0); a UI mostra estado de erro/retry.
  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const {
    data: reputation,
    isLoading: reputationLoading,
    isError: reputationError,
    refetch: refetchReputation,
  } = useQuery({
    queryKey: ["reputation", user?.id || user?.email],
    queryFn: () => fetchReputation(user?.id),
  });

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  // 1. Meus Squads (onde o usuário é dono ou membro confirmado pelo backend/histórico)
  const myProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter((p) => {
      const isOwner = Number(p.creatorId) === Number(user.id) || p.createdBy === "Você";
      const isDirectMember = Boolean(p.isMember);
      const isHistoryMember = (reputation?.history ?? []).some(
        (h) => String(h.id) === String(p.id) && h.memberStatus === "ativo"
      );
      return isOwner || isDirectMember || isHistoryMember;
    });
  }, [projects, user, reputation]);

  // IDs dos squads do usuário para consultar as tarefas reais
  const myProjectIds = useMemo(() => {
    if (myProjects.length > 0) {
      return myProjects.map((p) => String(p.id));
    }
    if (!reputation) return [];
    return Array.from(new Set((reputation.history ?? []).map((h) => String(h.id)).filter(Boolean)));
  }, [myProjects, reputation]);

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
    let review = 0;
    let done = 0;

    for (const query of taskQueries) {
      for (const task of query.data ?? []) {
        if (task.status === "todo") todo++;
        else if (task.status === "doing") doing++;
        else if (task.status === "review") review++;
        else if (task.status === "done") done++;
      }
    }

    return [
      { name: "A fazer", quantidade: todo, fill: "#94a3b8" },
      { name: "Em progresso", quantidade: doing, fill: "#f59e0b" },
      { name: "Em revisão", quantidade: review, fill: "#0ea5e9" },
      { name: "Concluído", quantidade: done, fill: "#10b981" },
    ];
  }, [taskQueries]);

  // Lista de todas as tarefas de todos os squads do usuário
  const allUserSquadTasks = useMemo(() => {
    const list: Array<{ task: KanbanTask; projectId: string; projectName: string }> = [];
    myProjects.forEach((proj, idx) => {
      const q = taskQueries[idx];
      if (q && q.data) {
        q.data.forEach((t) => {
          list.push({ task: t, projectId: String(proj.id), projectName: proj.name });
        });
      }
    });
    return list;
  }, [myProjects, taskQueries]);

  // Tarefas atribuídas diretamente ao usuário conectado
  const myAssignedTasks = useMemo(() => {
    if (!user) return [];
    const userNameNorm = user.name?.toLowerCase().trim();
    return allUserSquadTasks.filter(({ task }) => {
      if (task.assigneeId && Number(task.assigneeId) === Number(user.id)) return true;
      if (task.assignee && userNameNorm && task.assignee.toLowerCase().trim() === userNameNorm) return true;
      return false;
    });
  }, [allUserSquadTasks, user]);

  const myPendingTasks = useMemo(() => {
    return myAssignedTasks.filter(({ task }) => task.status !== "done");
  }, [myAssignedTasks]);

  const myCompletedTasks = useMemo(() => {
    return myAssignedTasks.filter(({ task }) => task.status === "done");
  }, [myAssignedTasks]);

  // Gráfico do status dos squads do usuário
  const projectStatusData = useMemo(() => {
    const counts = { Aberto: 0, "Em andamento": 0, Finalizado: 0 };
    myProjects.forEach((p) => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return [
      { name: "Aberto", value: counts["Aberto"], color: "#6366f1" },
      { name: "Em progresso", value: counts["Em andamento"], color: "#f59e0b" },
      { name: "Finalizado", value: counts["Finalizado"], color: "#10b981" },
    ].filter((item) => item.value > 0);
  }, [myProjects]);

  const totalTasksCount = useMemo(() => {
    return taskStatusData.reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [taskStatusData]);

  const completedTasksCount = useMemo(() => {
    return taskStatusData.find((t) => t.name === "Concluído")?.quantidade || 0;
  }, [taskStatusData]);

  const tasksLoading = taskQueries.some((q) => q.isPending);
  const tasksError = taskQueries.some((q) => q.isError);
  const retryTasks = () => {
    taskQueries.forEach((q) => {
      q.refetch();
    });
  };

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
            <Card className="w-full rounded-2xl border-border/60 bg-linear-to-br from-primary/5 via-card to-card md:max-w-xs">
              <CardContent className="flex flex-col gap-3 p-4">
                {reputationLoading ? (
                  <div className="space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <Skeleton className="ml-auto h-2 w-28" />
                  </div>
                ) : reputationError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Não foi possível carregar seu nível/XP
                    </p>
                    <button
                      onClick={() => refetchReputation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      <RefreshCcw className="h-3 w-3" />
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <>
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
                      <Progress value={xpProgressPercent} className="h-2.5" />
                      <p className="text-[10px] text-right text-muted-foreground">
                        Faltam {reputation ? Math.max(0, reputation.xpToNext - reputation.xp) : 0}{" "}
                        XP para o próximo nível
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards — Focado nos Dados Pessoais do Usuário */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/meus-projetos" className="block">
              <Card className="rounded-2xl border-border/60 transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FolderKanban className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Meus Squads Ativos</p>
                    {projectsLoading ? (
                      <Skeleton className="my-1 h-7 w-12 rounded-md" />
                    ) : projectsError ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <button
                          onClick={() => refetchProjects()}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold">{myProjects.length}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">como dono ou membro</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CheckSquare className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Minhas Tarefas Pendentes</p>
                  {tasksLoading ? (
                    <Skeleton className="my-1 h-7 w-16 rounded-md" />
                  ) : tasksError ? (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <button
                        onClick={() => retryTasks()}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">
                      {myPendingTasks.length}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        em andamento
                      </span>
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {myCompletedTasks.length} concluídas por você
                  </p>
                </div>
              </CardContent>
            </Card>

            <Link to="/notificacoes" className="block">
              <Card className="rounded-2xl border-border/60 transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Bell className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Avisos Pendentes</p>
                    {notificationsLoading ? (
                      <Skeleton className="my-1 h-7 w-10 rounded-md" />
                    ) : notificationsError ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <button
                          onClick={() => refetchNotifications()}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold">{unreadNotifCount}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">não lidas</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/perfil" className="block">
              <Card className="rounded-2xl border-border/60 transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Minhas Conquistas</p>
                    {reputationLoading ? (
                      <Skeleton className="my-1 h-7 w-10 rounded-md" />
                    ) : reputationError ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <button
                          onClick={() => refetchReputation()}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold">{reputation?.achievements.length || 0}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">badges desbloqueadas</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Minhas Tarefas em Foco / Próximos Passos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Minhas Tarefas em Andamento</h2>
                <p className="text-xs text-muted-foreground">
                  Tarefas atribuídas a você nos seus squads que precisam de atenção.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">
                {myPendingTasks.length} {myPendingTasks.length === 1 ? "tarefa" : "tarefas"}
              </span>
            </div>

            {tasksLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : myPendingTasks.length === 0 ? (
              <Card className="rounded-2xl border-dashed border-border/70 bg-muted/10 p-6 text-center">
                <p className="text-sm font-medium text-foreground">Você está em dia!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nenhuma tarefa pendente atribuída diretamente a você no momento. Acesse seus squads para assumir novas demandas.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myPendingTasks.slice(0, 6).map(({ task, projectId, projectName }) => (
                  <Link
                    key={`${projectId}-${task.id}`}
                    to="/projetos/$id"
                    params={{ id: projectId }}
                    className="block"
                  >
                    <Card className="h-full rounded-2xl border-border/60 p-4 transition-all hover:border-primary/40 hover:shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {projectName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            task.status === "doing"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : task.status === "review"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {task.status === "doing"
                            ? "Em progresso"
                            : task.status === "review"
                            ? "Em revisão"
                            : "A fazer"}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                        <span>
                          {task.subtasks && task.subtasks.length > 0
                            ? `${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length} subtarefas`
                            : "Sem checklist"}
                        </span>
                        <span className="font-medium text-primary hover:underline">
                          Abrir squad →
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recomendados para você (ETAPA 16 — matching desenvolvedor ↔ projeto) */}
          <RecomendadosParaVoce />

          {/* Seção de Métricas e Gráficos dos Squads */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Visão Geral dos Squads</h2>
              <p className="text-sm text-muted-foreground">
                Acompanhe o status dos projetos e a distribuição das tarefas nos Kanbans.
              </p>
            </div>
            <DashboardCharts
              projectStatusData={projectStatusData}
              taskStatusData={taskStatusData}
              tasksLoading={tasksLoading}
              totalTasksCount={totalTasksCount}
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

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});
