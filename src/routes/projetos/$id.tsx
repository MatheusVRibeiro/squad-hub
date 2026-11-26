import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
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
import { Mural } from "@/components/projects/Mural";
import { MembersList } from "@/components/projects/MembersList";
import { ProjectEvaluationsTab } from "@/components/projects/ProjectEvaluationsTab";
import { Applications } from "@/components/projects/Applications";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkspaceLinksForm } from "@/components/projects/WorkspaceLinksForm";
import { ProjectSettings } from "@/components/projects/ProjectSettings";
import {
  fetchProjectDetail,
  closeProjectLocal,
  cancelarCandidaturaLocal,
  atualizarVisibilidadeProjeto,
  atualizarLinksProjeto,
  fetchProjectReviews,
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
  const [cancellingApplication, setCancellingApplication] = useState(false);

  // Refatoração UI/UX (ETAPA 1+4): navegação principal da tela de projeto.
  // Kanban é a aba padrão; Mural/Membros/Vagas/Recomendadas/Candidaturas foram
  // agrupados nas áreas (Atividade/Equipe) e saíram do primeiro nível.
  const search = useSearch({ strict: false }) as { tab?: string; subtab?: string };
  const [activeTab, setActiveTab] = useState(search?.tab || "kanban");
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [activitySubTab, setActivitySubTab] = useState("timeline");
  const [teamSubTab, setTeamSubTab] = useState(search?.subtab || "membros");

  useEffect(() => {
    if (search?.tab) {
      setActiveTab(search.tab);
    }
    if (search?.subtab) {
      setTeamSubTab(search.subtab);
    }
  }, [search?.tab, search?.subtab]);

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

  // FASE-03.H: permissões por id e fallback por nome seguro
  const isOwner = data
    ? (data.creatorId != null && user?.id != null && Number(data.creatorId) === Number(user.id)) ||
      Boolean(user?.name && data.createdBy && data.createdBy.toLowerCase() === user.name.toLowerCase()) ||
      data.createdBy === "Você"
    : false;

  const isMember = data
    ? isOwner ||
      data.members.some(
        (m) =>
          (m.id != null && user?.id != null && Number(m.id) === Number(user.id)) ||
          Boolean(user?.name && m.name && m.name.toLowerCase() === user.name.toLowerCase()),
      )
    : false;

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["projectReviews", id],
    queryFn: () => fetchProjectReviews(id),
    enabled: Boolean(id) && isMember,
    staleTime: 30_000,
  });

  // A2: candidatura do usuário por ID (a.userId mapeado de usuario_id) — cai
  // por nome apenas quando o backend ainda não envia o id (pré-correção).
  const application = data?.applications.find((a) =>
    a.userId != null ? Number(a.userId) === Number(user?.id) : a.name === user?.name,
  );
  const hasApplied = !!application && application.status === "pending";

  async function handleCancelApplication() {
    if (!data) return;
    setCancellingApplication(true);
    try {
      await cancelarCandidaturaLocal(data.id, application?.id);
      toast.success("Candidatura cancelada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar candidatura.");
    } finally {
      setCancellingApplication(false);
    }
  }

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
    setActiveTab("equipe");
    setTeamSubTab("membros");
    scrollToSection("secao-equipe");
  }

  function goToSettings(anchor?: "privacidade" | "links") {
    if (anchor === "links") {
      setLinksDialogOpen(true);
      return;
    }
    setActiveTab("configuracoes");
    scrollToSection("secao-settings-privacidade");
  }

  // Se o projeto estiver finalizado e o usuário NÃO participou do squad, acesso bloqueado
  const isFinalizado = Boolean(
    data &&
      (data.status === "Finalizado" ||
        String(data.status).toLowerCase() === "finalizado"),
  );

  if (data && isFinalizado && !isMember) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="mx-auto w-full max-w-2xl py-12 text-center">
            <div className="rounded-3xl border border-border/80 bg-card/60 p-8 shadow-sm backdrop-blur-sm space-y-4">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lock className="h-6 w-6" />
              </span>
              <h2 className="text-xl font-bold text-foreground">Projeto Finalizado</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este projeto foi concluído e encerrado. O acesso e a visualização do squad e das entregas
                são restritos exclusivamente aos membros que fizeram parte da equipe.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/projetos">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para projetos
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
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
            /* A1: falha na API nunca deixa skeleton infinito — card de erro com retry ou bloqueio de squad finalizado. */
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <Lock className="h-6 w-6" />
              </span>
              <p className="mt-3 text-base font-semibold text-foreground">
                {error instanceof Error && error.message.toLowerCase().includes("finalizado")
                  ? "Acesso Restrito ao Squad Finalizado"
                  : "Não foi possível carregar o projeto"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Verifique sua conexão com o backend e tente novamente."}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-xl">
                  <Link to="/projetos">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar para projetos
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => refetch()}
                  className="cursor-pointer rounded-xl"
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
                </Button>
              </div>
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
                onGoToSettings={goToSettings}
                onApplicationSubmitted={() => {
                  queryClient.invalidateQueries({ queryKey: ["project", id] });
                  queryClient.invalidateQueries({ queryKey: ["projects"] });
                  queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  refetch();
                }}
                onCancelApplication={handleCancelApplication}
                cancellingApplication={cancellingApplication}
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
                    {data.status === "Finalizado" && (
                      <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
                    )}
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
                        isFinalizado={data.status === "Finalizado"}
                        isOwner={isOwner}
                      />
                    </TabsContent>
                  </Tabs>

                </TabsContent>

                {/* TeamSection (ETAPA 9) — Membros | Vagas | Candidaturas (owner). */}
                <TabsContent value="equipe" className="scroll-mt-16 space-y-4">
                  <Tabs value={teamSubTab} onValueChange={setTeamSubTab} className="space-y-4">
                    <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
                      <TabsTrigger value="membros">Membros</TabsTrigger>
                      {/* Sub-aba Vagas desativada temporariamente */}
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
                      <MembersList
                        members={data.members}
                        projectId={data.id}
                        currentUserId={user?.id != null ? Number(user.id) : undefined}
                      />
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

                {/* Seção Avaliações (exibida apenas quando o projeto estiver finalizado) */}
                {data.status === "Finalizado" && (
                  <TabsContent value="avaliacoes" className="scroll-mt-16 space-y-4">
                    <ProjectEvaluationsTab
                      projectId={data.id}
                      members={data.members}
                      currentUserId={user?.id != null ? Number(user.id) : undefined}
                      isMemberOrOwner={isMember}
                      reviewsData={reviewsData}
                      onReviewSubmitted={() => {
                        refetchReviews();
                        queryClient.invalidateQueries({ queryKey: ["projectReviews", id] });
                        queryClient.invalidateQueries({ queryKey: ["reputation"] });
                      }}
                    />
                  </TabsContent>
                )}

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
              {isOwner && data && (
                <Dialog open={linksDialogOpen} onOpenChange={setLinksDialogOpen}>
                  <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Links de trabalho do squad</DialogTitle>
                      <DialogDescription>
                        Atualize os links usados pelo time (GitHub, Figma, comunicação e
                        documentação). Deixe vazio para remover.
                      </DialogDescription>
                    </DialogHeader>
                    <WorkspaceLinksForm
                      initial={{
                        repositorioUrl: data.repositorioUrl ?? "",
                        figmaUrl: data.figmaUrl ?? "",
                        discordUrl: data.discordUrl ?? "",
                        documentacaoUrl: data.documentacaoUrl ?? "",
                      }}
                      submitting={updateLinks.isPending}
                      onSave={(links) => {
                        updateLinks.mutate(links);
                        setLinksDialogOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
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
