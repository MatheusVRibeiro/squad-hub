import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { TasksRecomendadas } from "@/components/projects/TasksRecomendadas";
import { GithubProjectPanel } from "@/components/projects/GithubProjectPanel";
import { TopCommitters } from "@/components/projects/TopCommitters";
import { TopContributors } from "@/components/projects/TopContributors";
import { InsightsResumo } from "@/components/projects/InsightsResumo";
import { Mural } from "@/components/projects/Mural";
import { MembersList } from "@/components/projects/MembersList";
import { Applications } from "@/components/projects/Applications";
import { Vagas } from "@/components/projects/Vagas";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectSettings } from "@/components/projects/ProjectSettings";
import {
  fetchProjectDetail,
  closeProjectLocal,
  atualizarVisibilidadeProjeto,
  atualizarLinksProjeto,
  type ProjectDetail,
} from "@/services/projectDetail";
import { sairDoProjeto } from "@/services/membros";
import { useAuth } from "@/contexts/AuthContext";

function ProjectDetailPage() {
  const { id } = useParams({ from: "/projetos/$id" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // Refatoração UI/UX (ETAPA 1+4): navegação principal da tela de projeto.
  // Kanban é a aba padrão; Mural/Membros/Vagas/Recomendadas/Candidaturas foram
  // agrupados nas áreas (Atividade/Equipe) e saíram do primeiro nível.
  const [activeTab, setActiveTab] = useState("kanban");
  const [activitySubTab, setActivitySubTab] = useState("timeline");
  const [teamSubTab, setTeamSubTab] = useState("membros");

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProjectDetail(id),
  });

  // ETAPA 14: privacidade do projeto — PATCH /projetos/:id (somente o dono).
  // Otimista: aplica a mudança no cache imediatamente e reverte em caso de erro.
  const updatePrivacy = useMutation({
    mutationFn: (changes: {
      visibilidade?: "publico" | "privado";
      permitirPortfolioPublico?: boolean;
    }) => atualizarVisibilidadeProjeto(data?.id ?? "", changes),
    onMutate: async (changes) => {
      if (!data) return undefined;
      await queryClient.cancelQueries({ queryKey: ["project", data.id] });
      const previous = queryClient.getQueryData<ProjectDetail>(["project", data.id]);
      queryClient.setQueryData<ProjectDetail>(["project", data.id], (old) =>
        old ? { ...old, ...changes } : old,
      );
      return { previous, projectId: data.id };
    },
    onError: (err: Error, _changes, context) => {
      if (context?.previous && context?.projectId) {
        queryClient.setQueryData<ProjectDetail>(["project", context.projectId], context.previous);
      }
      toast.error(err.message || "Não foi possível atualizar a privacidade do projeto.");
    },
    onSuccess: () => {
      toast.success("Privacidade do projeto atualizada!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project", data?.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // ETAPA QA: links de trabalho do squad — PATCH /projetos/:id (somente o dono).
  const updateLinks = useMutation({
    mutationFn: (links: {
      repositorioUrl?: string;
      figmaUrl?: string;
      discordUrl?: string;
      documentacaoUrl?: string;
    }) => atualizarLinksProjeto(data?.id ?? "", links),
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível atualizar os links do projeto.");
    },
    onSuccess: () => {
      toast.success("Links de trabalho atualizados!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project", data?.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // FASE-03.H: permissões por id (não por nome) — homônimos não quebram.
  // creatorId vem mapeado de criador_id do backend; Number() normaliza string/número.
  const isOwner = data ? Number(data.creatorId) === Number(user?.id) : false;

  const isMember = data
    ? isOwner || data.members.some((m) => Number(m.id) === Number(user?.id))
    : false;

  // A2: candidatura do usuário por ID (a.userId mapeado de usuario_id) — cai
  // por nome apenas quando o backend ainda não envia o id (pré-correção).
  const application = data?.applications.find((a) =>
    a.userId != null ? Number(a.userId) === Number(user?.id) : a.name === user?.name,
  );
  const hasApplied = !!application && application.status === "pending";

  async function handleCloseProject() {
    if (!data) return;
    if (
      !window.confirm(
        `Tem certeza que deseja encerrar o projeto "${data.name}"? Ele continuará listado, mas com o status "Finalizado".`,
      )
    )
      return;

    setClosing(true);
    try {
      await closeProjectLocal(data.id);
      toast.success("Projeto encerrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      refetch();
    } catch {
      toast.error("Erro ao encerrar projeto.");
    } finally {
      setClosing(false);
    }
  }

  // ETAPA 6: membro sai do squad — soft-delete no backend (status 'saiu'),
  // histórico preservado. Owner não vê o botão (não pode sair).
  async function handleLeaveProject() {
    if (!data) return;
    if (
      !window.confirm(
        `Tem certeza que deseja sair do projeto "${data.name}"? Você deixará de ter acesso à área de trabalho do squad.`,
      )
    )
      return;

    setSaindo(true);
    try {
      await sairDoProjeto(data.id);
      toast.success("Você saiu do projeto com sucesso.");
      // Remove o membro da lista ativa localmente (sem depender de refetch).
      queryClient.setQueryData<ProjectDetail>(["project", data.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.filter((m) => Number(m.id) !== Number(user?.id)),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sair do projeto.");
    } finally {
      setSaindo(false);
    }
  }

  // Refatoração UI/UX (ETAPA 3/4): ações frequentes e menu '...' navegam para
  // as áreas correspondentes — os controles continuam existindo nas seções.
  function scrollToSection(sectionId: string) {
    if (typeof window === "undefined") return;
    // Aguarda o commit do React ao trocar de aba antes de rolar.
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function goToKanban() {
    setActiveTab("kanban");
    scrollToSection("secao-kanban");
  }

  function goToConvidar() {
    // Não existe endpoint de convite; a área de Vagas (Nova Vaga) é o mecanismo
    // real de atrair membros — o botão leva o owner até ela.
    setActiveTab("equipe");
    setTeamSubTab("vagas");
    scrollToSection("secao-equipe");
  }

  function goToGithub() {
    setActiveTab("github");
    scrollToSection("secao-github");
  }

  function goToSettings(anchor?: "privacidade" | "links") {
    scrollToSection(anchor === "links" ? "secao-settings-links" : "secao-settings-privacidade");
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit rounded-xl">
            <Link to="/projetos">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para projetos
            </Link>
          </Button>

          {isLoading ? (
            /* ETAPA 17: skeletons do novo layout — header compacto + tabs + kanban.
               Insights (TopContributors/TopCommitters) têm queries próprias dentro da
               aba e nunca bloqueiam o Kanban (dados independentes). */
            <div className="space-y-4" aria-busy="true" aria-label="Carregando projeto">
              {/* Header skeleton (compacto, espelha o ProjectHeader) */}
              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-md">
                <div className="h-2 bg-primary/20" />
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Skeleton className="h-7 w-56 rounded-lg sm:w-72" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-9 w-28 rounded-xl" />
                      <Skeleton className="h-9 w-9 rounded-xl" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full max-w-xl rounded-md" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Tabs skeleton — mesma barra sticky do layout real */}
              <div className="sticky top-14 z-20 -mx-1 rounded-xl bg-background/85 px-1 py-2 backdrop-blur">
                <div className="flex w-full justify-start gap-1.5 overflow-x-auto rounded-lg bg-muted p-1">
                  <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
                  <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
                  <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
                  <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
                  <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
                </div>
              </div>

              {/* Kanban skeleton — 4 colunas com 2-3 cards (mesmo grid do KanbanBoard) */}
              <div className="flex gap-6 overflow-x-auto pb-2 xl:grid xl:grid-cols-4 xl:overflow-x-visible">
                {[3, 2, 3, 2].map((cards, col) => (
                  <div
                    key={col}
                    className="flex min-h-112.5 w-70 shrink-0 flex-col gap-4 rounded-2xl border border-border/50 bg-card/45 p-4 backdrop-blur-sm xl:w-auto xl:min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-24 rounded-md" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                    {Array.from({ length: cards }, (_, card) => (
                      <div
                        key={card}
                        className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
                      >
                        <Skeleton className="h-4 w-4/5 rounded-md" />
                        <Skeleton className="mt-2 h-3 w-3/5 rounded-md" />
                        <Skeleton className="mt-3 h-3 w-1/2 rounded-md" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : isError || !data ? (
            /* A1: falha na API nunca deixa skeleton infinito — card de erro com retry. */
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                Não foi possível carregar o projeto
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Verifique sua conexão com o backend e tente novamente."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-4 cursor-pointer"
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Cabeçalho compacto (ETAPA 2) — ações frequentes + menu '...'. */}
              <ProjectHeader
                data={data}
                isOwner={isOwner}
                isMember={isMember}
                hasApplied={hasApplied}
                application={application}
                closing={closing}
                saindo={saindo}
                onCloseProject={handleCloseProject}
                onLeaveProject={handleLeaveProject}
                onNovaTarefa={goToKanban}
                onConvidar={goToConvidar}
                onGoToGithub={goToGithub}
                onGoToSettings={goToSettings}
                onApplicationSubmitted={refetch}
              />

              {!isMember && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 shadow-sm backdrop-blur-sm dark:text-amber-400/90">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <span>
                    Você está visualizando este projeto como visitante. Para participar do mural ou
                    do quadro Kanban, candidate-se ao squad.
                  </span>
                </div>
              )}

              {/* Navegação principal (ETAPA 4) — sticky abaixo do header global (h-14). */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="sticky top-14 z-20 -mx-1 rounded-xl bg-background/85 px-1 py-2 backdrop-blur">
                  <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
                    <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    <TabsTrigger value="atividade">Atividade</TabsTrigger>
                    <TabsTrigger value="equipe">Equipe</TabsTrigger>
                    <TabsTrigger value="github">GitHub</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    {isOwner && <TabsTrigger value="configuracoes">Configurações</TabsTrigger>}
                  </TabsList>
                </div>

                {/* KanbanSection (ETAPA 5+8) — o quadro aparece imediatamente após
                    header+navegação; TasksRecomendadas logo abaixo (só membros). */}
                <TabsContent value="kanban" className="scroll-mt-16 space-y-6">
                  {data.status === "Finalizado" && (
                    <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-800 shadow-sm backdrop-blur-sm dark:text-blue-300">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Este projeto foi finalizado. O quadro Kanban está em modo somente leitura para preservação do histórico de entregas.
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <KanbanBoard
                      initial={data.tasks}
                      projectId={data.id}
                      projectName={data.name}
                      readOnly={!isMember || data.status === "Finalizado"}
                      members={data.members}
                      onRefresh={() => refetch()}
                      updatedAt={dataUpdatedAt}
                    />
                  </motion.div>
                  {isMember && data.status !== "Finalizado" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <TasksRecomendadas projetoId={data.id} projectName={data.name} />
                    </motion.div>
                  )}
                </TabsContent>

                {/* ActivitySection (ETAPA 10) — Timeline (membros) + Mural. */}
                <TabsContent value="atividade" className="scroll-mt-16 space-y-4">
                  <Tabs
                    value={isMember ? activitySubTab : "mural"}
                    onValueChange={setActivitySubTab}
                    className="space-y-4"
                  >
                    <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
                      {isMember && <TabsTrigger value="timeline">Timeline</TabsTrigger>}
                      <TabsTrigger value="mural">Mural</TabsTrigger>
                    </TabsList>
                    {isMember && (
                      <TabsContent value="timeline">
                        {/* ETAPA 15: timeline de atividade do projeto (exige ser membro/dono). */}
                        <ProjectTimeline projectId={data.id} />
                      </TabsContent>
                    )}
                    <TabsContent value="mural">
                      <Mural
                        initial={data.messages}
                        projectId={data.id}
                        projectName={data.name}
                        readOnly={!isMember}
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* TeamSection (ETAPA 9) — Membros | Vagas | Candidaturas (owner). */}
                <TabsContent value="equipe" className="scroll-mt-16 space-y-4">
                  <Tabs value={teamSubTab} onValueChange={setTeamSubTab} className="space-y-4">
                    <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
                      <TabsTrigger value="membros">Membros</TabsTrigger>
                      <TabsTrigger value="vagas">Vagas</TabsTrigger>
                      {isOwner && (
                        <TabsTrigger value="candidaturas">
                          Candidaturas
                          {data.applications.filter((a) => a.status === "pending").length > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-2 h-5 rounded-full px-1.5 text-[10px]"
                            >
                              {data.applications.filter((a) => a.status === "pending").length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="membros">
                      <MembersList members={data.members} />
                    </TabsContent>
                    <TabsContent value="vagas">
                      <Vagas initial={data.vagas} projectId={data.id} isOwner={isOwner} />
                    </TabsContent>
                    {isOwner && (
                      <TabsContent value="candidaturas">
                        <Applications
                          initial={data.applications}
                          projectId={data.id}
                          projectName={data.name}
                        />
                      </TabsContent>
                    )}
                  </Tabs>
                </TabsContent>

                {/* GithubSection (ETAPA 11) — integração concentrada em um local. */}
                <TabsContent value="github" className="scroll-mt-16 space-y-4">
                  <GithubProjectPanel projectId={data.id} isOwner={isOwner} />
                </TabsContent>

                {/* InsightsSection (ETAPA 12) — resumo + rankings fora do fluxo vertical. */}
                <TabsContent value="insights" className="scroll-mt-16 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Resumo do projeto (ETAPA 12) — métricas derivadas de data.tasks
                        (zero queries novas); empty state compacto. */}
                    <InsightsResumo tasks={data.tasks} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {/* Top Contributors do projeto (ETAPA 13) — ranking principal */}
                    <TopContributors projectId={data.id} scope="project" limit={5} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {/* Top Committers do projeto (ETAPA 11) — métrica secundária */}
                    <TopCommitters projectId={data.id} scope="project" limit={5} />
                  </motion.div>
                </TabsContent>

                {/* SettingsSection (ETAPA 2 do plano Kanban escalável) — Privacidade +
                                    Links + Encerrar (somente dono), agora DENTRO da tab Configurações. */}
                {isOwner && (
                  <TabsContent value="configuracoes" className="scroll-mt-16 space-y-4">
                    <ProjectSettings
                      data={data}
                      isOwner={isOwner}
                      updatePrivacy={updatePrivacy}
                      updateLinks={updateLinks}
                      closing={closing}
                      onCloseProject={handleCloseProject}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/projetos/$id")({
  component: ProjectDetailPage,
});
