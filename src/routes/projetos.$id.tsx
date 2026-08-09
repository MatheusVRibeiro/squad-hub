import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Users, Lock, Github, MessageSquare, BookOpen } from "lucide-react";
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
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { GithubProjectPanel } from "@/components/projects/GithubProjectPanel";
import { TopCommitters } from "@/components/projects/TopCommitters";
import { TopContributors } from "@/components/projects/TopContributors";
import { Mural } from "@/components/projects/Mural";
import { MembersList } from "@/components/projects/MembersList";
import { Applications } from "@/components/projects/Applications";
import { Vagas } from "@/components/projects/Vagas";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import {
  fetchProjectDetail,
  closeProjectLocal,
  atualizarVisibilidadeProjeto,
  type ProjectDetail,
} from "@/services/projectDetail";
import { candidatarComVaga } from "@/services/candidaturas";
import { sairDoProjeto } from "@/services/membros";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsIntegration } from "@/services/notificationsIntegration";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vaga } from "@/services/vagas";

function ApplicationForm({
  projectId,
  projectName,
  vagas,
  onSubmitted,
}: {
  projectId: string;
  projectName: string;
  /** Vagas abertas do projeto (ETAPA 4) — select opcional de vaga na candidatura. */
  vagas: Vaga[];
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [skills, setSkills] = useState(user?.skills?.join(", ") || "");
  const [vagaId, setVagaId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Somente vagas abertas com posição disponível aparecem no select
  const vagasDisponiveis = vagas.filter(
    (v) => v.status === "aberta" && v.preenchidas < v.quantidade,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Por favor, digite uma mensagem de apresentação.");
      return;
    }
    setSubmitting(true);
    try {
      // ETAPA 5: candidatura direcionada por vaga — vaga_id opcional, mensagem obrigatória.
      await candidatarComVaga(projectId, {
        vaga_id: vagaId ? Number(vagaId) : null,
        mensagem: message.trim(),
      });
      // Notifica
      notificationsIntegration.notifyApplied(projectName, user?.name || "Usuário", projectId);
      toast.success("Sua candidatura foi enviada com sucesso!");
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar candidatura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="app-message">Mensagem de Apresentação</Label>
        <Textarea
          id="app-message"
          placeholder="Ex: Tenho interesse em ajudar com a API rest e banco de dados..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>
      {vagasDisponiveis.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="app-vaga">Vaga desejada (opcional)</Label>
          <Select value={vagaId} onValueChange={setVagaId}>
            <SelectTrigger id="app-vaga" className="w-full cursor-pointer">
              <SelectValue placeholder="Selecione uma vaga do projeto" />
            </SelectTrigger>
            <SelectContent>
              {vagasDisponiveis.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.funcao_nome} ({v.preenchidas}/{v.quantidade})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="app-skills">Suas Habilidades (separadas por vírgula)</Label>
        <Input
          id="app-skills"
          placeholder="React, Node.js, TypeScript"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting} className="rounded-xl">
          {submitting ? "Enviando..." : "Enviar Candidatura"}
        </Button>
      </div>
    </form>
  );
}

function ProjectDetailPage() {
  const { id } = useParams({ from: "/projetos/$id" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const { data, isLoading, refetch } = useQuery({
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

  // FASE-03.H: permissões por id (não por nome) — homônimos não quebram.
  // creatorId vem mapeado de criador_id do backend; Number() normaliza string/número.
  const isOwner = data ? Number(data.creatorId) === Number(user?.id) : false;

  const isMember = data
    ? isOwner || data.members.some((m) => Number(m.id) === Number(user?.id))
    : false;

  const application = data?.applications.find((a) => a.name === user?.name);
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

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit rounded-xl">
            <Link to="/projetos">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para projetos
            </Link>
          </Button>

          {isLoading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-9 w-72 rounded-xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden rounded-3xl border-border/60 bg-gradient-to-br from-card to-card/98 shadow-md dark:to-card/95">
                  <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/30" />
                  <CardContent className="space-y-4 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Projeto
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                          {data.name}
                        </h1>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full",
                            data.status === "Finalizado"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : "",
                          )}
                        >
                          {data.status}
                        </Badge>

                        {/* ETAPA 14: projeto privado (visibilidade 'privado' ou portfólio
                            público bloqueado) — mesmo padrão do VerifiedContributions. */}
                        {(data.visibilidade === "privado" || !data.permitirPortfolioPublico) && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                          >
                            <Lock className="mr-1 h-3 w-3" />
                            Privado
                          </Badge>
                        )}

                        {isOwner && data.status !== "Finalizado" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 h-7 text-xs"
                            onClick={handleCloseProject}
                            disabled={closing}
                          >
                            {closing ? "Encerrando..." : "Encerrar Projeto"}
                          </Button>
                        )}

                        {isMember && !isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 h-7 text-xs"
                            onClick={handleLeaveProject}
                            disabled={saindo}
                          >
                            {saindo ? "Saindo..." : "Sair do projeto"}
                          </Button>
                        )}

                        {!isMember && (
                          <div className="flex items-center gap-2">
                            {hasApplied ? (
                              <Button
                                disabled
                                size="sm"
                                className="rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              >
                                Candidatura Pendente
                              </Button>
                            ) : application?.status === "rejected" ? (
                              <Button
                                disabled
                                variant="destructive"
                                size="sm"
                                className="rounded-xl"
                              >
                                Recusado
                              </Button>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="rounded-xl bg-gradient-to-r from-primary to-primary/80"
                                  >
                                    Candidatar-se ao Squad
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Candidatura para o Squad</DialogTitle>
                                    <DialogDescription>
                                      Conte ao criador do projeto por que você gostaria de
                                      participar e quais habilidades pode agregar.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ApplicationForm
                                    projectId={data.id}
                                    projectName={data.name}
                                    vagas={data.vagas}
                                    onSubmitted={refetch}
                                  />
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{data.longDescription}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.technologies.map((t) => (
                        <Badge key={t} variant="secondary" className="rounded-full text-[11px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {data.membersCount}/{data.membersLimit}{" "}
                        membros
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />{" "}
                        {new Date(data.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <span>Criado por {data.createdBy}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ETAPA 14: controle de privacidade do projeto (somente o dono) */}
              {isOwner && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
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
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        Área de Trabalho do Squad
                      </h2>
                      {!isMember && (
                        <Badge
                          variant="outline"
                          className="rounded-full gap-1 h-5 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        >
                          <Lock className="h-3 w-3" /> Privado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Links úteis para o desenvolvimento e comunicação da equipe.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      {/* Repositório */}
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                          isMember && data.repositorioUrl
                            ? "bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer"
                            : "bg-muted/30 border-border/40 opacity-70",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl",
                            isMember && data.repositorioUrl
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Github className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            GitHub
                          </p>
                          {isMember ? (
                            data.repositorioUrl ? (
                              <a
                                href={data.repositorioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-primary hover:underline truncate block"
                              >
                                Acessar código
                              </a>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Não definido
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Figma */}
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                          isMember && data.figmaUrl
                            ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 cursor-pointer"
                            : "bg-muted/30 border-border/40 opacity-70",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl",
                            isMember && data.figmaUrl
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Protótipo (Figma)
                          </p>
                          {isMember ? (
                            data.figmaUrl ? (
                              <a
                                href={data.figmaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-rose-600 hover:underline truncate block"
                              >
                                Abrir figma
                              </a>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Não definido
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Discord */}
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                          isMember && data.discordUrl
                            ? "bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 cursor-pointer"
                            : "bg-muted/30 border-border/40 opacity-70",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl",
                            isMember && data.discordUrl
                              ? "bg-indigo-500/10 text-indigo-500"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Comunicação
                          </p>
                          {isMember ? (
                            data.discordUrl ? (
                              <a
                                href={data.discordUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-indigo-600 hover:underline truncate block"
                              >
                                Entrar no chat
                              </a>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Não definido
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Documentação */}
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                          isMember && data.documentacaoUrl
                            ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 cursor-pointer"
                            : "bg-muted/30 border-border/40 opacity-70",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl",
                            isMember && data.documentacaoUrl
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Documentos
                          </p>
                          {isMember ? (
                            data.documentacaoUrl ? (
                              <a
                                href={data.documentacaoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-amber-600 hover:underline truncate block"
                              >
                                Notion/Wiki
                              </a>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Não definido
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Conexão GitHub do projeto (ETAPA 5) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.12 }}
              >
                <GithubProjectPanel projectId={data.id} isOwner={isOwner} />
              </motion.div>

              {/* Top Contributors do projeto (ETAPA 13) — ranking principal */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.14 }}
              >
                <TopContributors projectId={data.id} scope="project" limit={5} />
              </motion.div>

              {/* Top Committers do projeto (ETAPA 11) — métrica secundária */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.16 }}
              >
                <TopCommitters projectId={data.id} scope="project" limit={5} />
              </motion.div>

              {!isMember && (
                <div className="rounded-2xl bg-amber-500/5 backdrop-blur-sm border border-amber-500/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-400/90 flex items-center gap-3 shadow-sm">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lock className="h-4 w-4 shrink-0" />
                  </span>
                  <span>
                    Você está visualizando este projeto como visitante. Para participar do mural ou
                    do quadro Kanban, candidate-se ao squad.
                  </span>
                </div>
              )}

              <Tabs defaultValue="kanban" className="space-y-4">
                <TabsList className="flex w-full justify-start overflow-x-auto rounded-xl">
                  <TabsTrigger value="kanban">Kanban</TabsTrigger>
                  <TabsTrigger value="mural">Mural</TabsTrigger>
                  <TabsTrigger value="membros">Membros</TabsTrigger>
                  <TabsTrigger value="vagas">Vagas</TabsTrigger>
                  {isMember && <TabsTrigger value="atividade">Atividade</TabsTrigger>}
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
                <TabsContent value="kanban">
                  <KanbanBoard
                    initial={data.tasks}
                    projectId={data.id}
                    projectName={data.name}
                    readOnly={!isMember}
                    members={data.members}
                  />
                </TabsContent>
                <TabsContent value="mural">
                  <Mural
                    initial={data.messages}
                    projectId={data.id}
                    projectName={data.name}
                    readOnly={!isMember}
                  />
                </TabsContent>
                <TabsContent value="membros">
                  <MembersList members={data.members} />
                </TabsContent>
                <TabsContent value="vagas">
                  <Vagas initial={data.vagas} projectId={data.id} isOwner={isOwner} />
                </TabsContent>
                {isMember && (
                  <TabsContent value="atividade">
                    {/* ETAPA 15: timeline de atividade do projeto (exige ser membro/dono). */}
                    <ProjectTimeline projectId={data.id} />
                  </TabsContent>
                )}
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
