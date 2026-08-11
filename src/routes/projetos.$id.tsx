import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Link2, Lock, Pencil, RefreshCcw, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { WorkspaceLinksForm } from "@/components/projects/WorkspaceLinksForm";
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

  const { data, isLoading, isError, error, refetch } = useQuery({
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
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit rounded-xl">
            <Link to="/projetos">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para projetos
            </Link>
          </Button>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-9 w-72 rounded-xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
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
                  </TabsList>
                </div>

                {/* KanbanSection (ETAPA 5+8) — o quadro aparece imediatamente após
                    header+navegação; TasksRecomendadas logo abaixo (só membros). */}
                <TabsContent value="kanban" className="scroll-mt-16 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <KanbanBoard
                      initial={data.tasks}
                      projectId={data.id}
                      projectName={data.name}
                      readOnly={!isMember}
                      members={data.members}
                    />
                  </motion.div>
                  {isMember && (
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
              </Tabs>

              {/* ProjectSettings (ETAPA 1) — Privacidade + Links + Encerrar (somente dono). */}
              {isOwner && (
                <section id="secao-settings" className="scroll-mt-16 space-y-6">
                  <div className="flex items-center gap-2 pt-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-bold text-foreground">
                      Configurações do projeto
                    </h2>
                  </div>

                  {/* Privacidade */}
                  <motion.div
                    id="secao-settings-privacidade"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="scroll-mt-16"
                  >
                    <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <h2 className="text-base font-bold text-foreground">Privacidade</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Controle quem vê o projeto e se as entregas do squad aparecem no portfólio
                          público dos membros.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="privacidade-visibilidade">Visibilidade</Label>
                            <Select
                              value={data.visibilidade ?? "publico"}
                              onValueChange={(value) =>
                                updatePrivacy.mutate({
                                  visibilidade: value as "publico" | "privado",
                                })
                              }
                            >
                              <SelectTrigger
                                id="privacidade-visibilidade"
                                className="w-full cursor-pointer"
                              >
                                <SelectValue placeholder="Selecione a visibilidade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="publico">Público</SelectItem>
                                <SelectItem value="privado">Privado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3.5">
                            <div className="space-y-0.5">
                              <Label
                                htmlFor="permitir-portfolio-publico"
                                className="text-xs font-semibold"
                              >
                                Permitir portfólio público
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Se desativado, o projeto aparece sem detalhes técnicos no portfólio
                                dos membros.
                              </p>
                            </div>
                            <Switch
                              id="permitir-portfolio-publico"
                              checked={data.permitirPortfolioPublico ?? true}
                              onCheckedChange={(checked) =>
                                updatePrivacy.mutate({ permitirPortfolioPublico: checked })
                              }
                              className="scale-95 cursor-pointer"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Links de trabalho do squad */}
                  <motion.div
                    id="secao-settings-links"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="scroll-mt-16"
                  >
                    <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <h2 className="text-base font-bold text-foreground">
                            Links de trabalho do squad
                          </h2>
                          {isOwner && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-auto h-7 gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar links
                                </Button>
                              </DialogTrigger>
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
                                  onSave={(links) => updateLinks.mutate(links)}
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Os links configurados aparecem em formato compacto no topo da página para
                          os membros do squad.
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Encerrar projeto */}
                  {data.status !== "Finalizado" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <Card className="rounded-3xl border border-destructive/20 bg-card shadow-sm">
                        <CardContent className="space-y-3 p-6">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <h2 className="text-base font-bold text-foreground">
                              Encerrar projeto
                            </h2>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Encerra o projeto e o mantém listado com o status "Finalizado". Esta
                            ação não pode ser desfeita.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10"
                            onClick={handleCloseProject}
                            disabled={closing}
                          >
                            {closing ? "Encerrando..." : "Encerrar Projeto"}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </section>
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
