import type { ReactNode } from "react";

import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Figma,
  Github,
  Link2,
  Lock,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApplicationForm } from "@/components/projects/ApplicationForm";
import { cn } from "@/lib/utils";
import type { Application, ProjectDetail } from "@/services/projectDetail";

/** Extrai "owner/repo" de uma URL do GitHub para o resumo compacto do header. */
function githubRepoLabel(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  } catch {
    return url;
  }
}

/** Pílula compacta de link de trabalho (ETAPA 14) — ícone + rótulo, abre em nova aba. */
function LinkPill({
  href,
  label,
  title,
  ariaLabel,
  icon,
  hoverClass,
}: {
  href: string;
  label: string;
  title?: string;
  ariaLabel: string;
  icon: ReactNode;
  hoverClass?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
        hoverClass,
      )}
    >
      {icon}
      {label}
    </a>
  );
}

type ProjectHeaderProps = {
  data: ProjectDetail;
  isOwner: boolean;
  isMember: boolean;
  hasApplied: boolean;
  application?: Application;
  closing: boolean;
  saindo: boolean;
  onCloseProject: () => void;
  onLeaveProject: () => void;
  /** Ação frequente: foca o Kanban (aba padrão). */
  onNovaTarefa: () => void;
  /** Ação frequente: owner → área de vagas (mecanismo real de atrair membros). */
  onConvidar: () => void;
  /** Menu admin: navega para a aba GitHub. */
  onGoToGithub: () => void;
  /** Menu admin: navega para as configurações do projeto (privacidade/links). */
  onGoToSettings: (anchor?: "privacidade" | "links") => void;
  onApplicationSubmitted: () => void;
};

/**
 * Cabeçalho compacto do projeto (refatoração UI/UX — ETAPA 2).
 * Apenas informações de leitura rápida + ações frequentes; controles
 * administrativos (privacidade, links, GitHub, encerrar) ficam no menu
 * '...' e nas áreas próprias da página.
 */
export function ProjectHeader({
  data,
  isOwner,
  isMember,
  hasApplied,
  application,
  closing,
  saindo,
  onCloseProject,
  onLeaveProject,
  onNovaTarefa,
  onConvidar,
  onGoToGithub,
  onGoToSettings,
  onApplicationSubmitted,
}: ProjectHeaderProps) {
  const finalizado = data.status === "Finalizado";

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-gradient-to-br from-card to-card/98 shadow-md dark:to-card/95">
      <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/30" />
      <CardContent className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 text-xl font-semibold tracking-tight sm:text-2xl">{data.name}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full",
                finalizado ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "",
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

            {/* Ações frequentes (ETAPA 3) — destaque para o que o time usa todo dia. */}
            {isMember && !finalizado && (
              <Button
                size="sm"
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80"
                onClick={onNovaTarefa}
              >
                <Plus className="mr-1 h-4 w-4" /> Nova tarefa
              </Button>
            )}
            {isOwner && !finalizado && (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={onConvidar}>
                <UserPlus className="mr-1.5 h-4 w-4" /> Convidar
              </Button>
            )}

            {/* Ações administrativas/destrutivas no menu '...' — não competem
                visualmente com 'Nova tarefa'. */}
            {(isOwner || (isMember && !isOwner)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl px-2"
                    aria-label="Mais ações do projeto"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isOwner && (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onGoToSettings("privacidade")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Privacidade
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onGoToSettings("links")}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Gerenciar links
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={onGoToGithub}>
                        <Github className="mr-2 h-4 w-4" />
                        Configurar GitHub
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!finalizado && (
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={onCloseProject}
                          disabled={closing}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {closing ? "Encerrando..." : "Encerrar projeto"}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {isMember && !isOwner && (
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={onLeaveProject}
                      disabled={saindo}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {saindo ? "Saindo..." : "Sair do projeto"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Visitante: candidatura continua como ação principal. */}
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
                  <Button disabled variant="destructive" size="sm" className="rounded-xl">
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
                          Conte ao criador do projeto por que você gostaria de participar e quais
                          habilidades pode agregar.
                        </DialogDescription>
                      </DialogHeader>
                      <ApplicationForm
                        projectId={data.id}
                        projectName={data.name}
                        vagas={data.vagas}
                        onSubmitted={onApplicationSubmitted}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{data.longDescription}</p>

        <div className="flex flex-wrap gap-1.5">
          {data.technologies.map((t) => (
            <Badge key={t} variant="secondary" className="rounded-full text-[11px]">
              {t}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {data.membersCount}/{data.membersLimit} membros
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Criado por {data.createdBy} ·{" "}
            {new Date(data.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </div>

        {/* ETAPA 14: links de trabalho do squad — apenas os configurados, em
            formato compacto; membros/donos abrem em nova aba, visitantes não veem. */}
        {isMember &&
          (data.repositorioUrl || data.figmaUrl || data.discordUrl || data.documentacaoUrl) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {data.repositorioUrl && (
                <LinkPill
                  href={data.repositorioUrl}
                  label="GitHub"
                  title={githubRepoLabel(data.repositorioUrl)}
                  ariaLabel="Abrir repositório do projeto no GitHub"
                  icon={<Github className="h-3.5 w-3.5" />}
                />
              )}
              {data.figmaUrl && (
                <LinkPill
                  href={data.figmaUrl}
                  label="Figma"
                  ariaLabel="Abrir protótipo do projeto no Figma"
                  icon={<Figma className="h-3.5 w-3.5" />}
                  hoverClass="hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-600"
                />
              )}
              {data.discordUrl && (
                <LinkPill
                  href={data.discordUrl}
                  label="Discord"
                  ariaLabel="Entrar no canal de comunicação do squad"
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  hoverClass="hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-600"
                />
              )}
              {data.documentacaoUrl && (
                <LinkPill
                  href={data.documentacaoUrl}
                  label="Docs"
                  ariaLabel="Abrir documentação do projeto"
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  hoverClass="hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600"
                />
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
