import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  FolderGit2,
  Lock,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Project } from "@/services/projects";
import { useAuth } from "@/contexts/AuthContext";

const statusStyles: Record<Project["status"], string> = {
  Aberto: "bg-primary/10 text-primary border-primary/20",
  "Em andamento": "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  Finalizado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface ProjectDetailsModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyClick?: () => void;
}

export function ProjectDetailsModal({
  project,
  open,
  onOpenChange,
  onApplyClick,
}: ProjectDetailsModalProps) {
  const { user } = useAuth();

  if (!project) return null;

  const closed =
    project.status === "Finalizado" ||
    String(project.status).toLowerCase() === "finalizado";

  const isOwner =
    (project.creatorId != null &&
      user?.id != null &&
      Number(project.creatorId) === Number(user.id)) ||
    Boolean(user?.name && project.createdBy && project.createdBy.toLowerCase() === user.name.toLowerCase()) ||
    project.createdBy === "Você";

  const isMember = isOwner || Boolean(project.isMember);

  const percentFilled = Math.round((project.membersCount / project.membersLimit) * 100);

  const matchingSkills = project.technologies.filter((tech) =>
    user?.skills?.some((skill) => skill.toLowerCase() === tech.toLowerCase()),
  );
  const matchPercent =
    project.technologies.length > 0
      ? Math.round((matchingSkills.length / project.technologies.length) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl border border-border/70 bg-card p-0 overflow-hidden shadow-2xl">
        <div className="h-2 w-full bg-linear-to-r from-primary via-primary/80 to-primary/30" />

        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FolderGit2 className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground tracking-tight leading-snug">
                    {project.name}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Criado por <span className="font-semibold text-foreground/80">{project.createdBy}</span> em {formatDate(project.createdAt)}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("rounded-full text-xs shrink-0 font-medium", statusStyles[project.status])}
              >
                {project.status}
              </Badge>
            </div>
            <DialogDescription className="sr-only">
              Detalhes informativos do squad {project.name}
            </DialogDescription>
          </DialogHeader>

          {/* Descrição do Projeto */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sobre o Projeto
            </h4>
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-48 overflow-y-auto">
              {project.description || "Nenhuma descrição fornecida para este projeto."}
            </div>
          </div>

          {/* Stack Tecnológica e Compatibilidade */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tecnologias Utilizadas
              </span>
              {user && (
                <span className="text-xs font-medium text-foreground">
                  Compatibilidade:{" "}
                  <strong
                    className={cn(
                      matchPercent === 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-primary",
                    )}
                  >
                    {matchPercent}%
                  </strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => {
                const matched = user?.skills?.some(
                  (skill) => skill.toLowerCase() === tech.toLowerCase(),
                );
                return (
                  <Badge
                    key={tech}
                    variant={matched ? "default" : "secondary"}
                    className={cn(
                      "rounded-full text-xs font-medium px-3 py-1 border transition-colors",
                      matched
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border/70",
                    )}
                  >
                    {matched && <Check className="mr-1.5 h-3 w-3 stroke-[3]" />}
                    {tech}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Status de Equipe e Ocupação */}
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 text-foreground/90">
                <Users className="h-4 w-4 text-primary" />
                Vagas e Membros
              </span>
              <span>
                {project.membersCount} de {project.membersLimit} membros ({percentFilled}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden border border-border/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  percentFilled >= 100
                    ? "bg-destructive"
                    : percentFilled >= 75
                      ? "bg-amber-500"
                      : "bg-primary",
                )}
                style={{ width: `${Math.min(percentFilled, 100)}%` }}
              />
            </div>
          </div>

          {/* Rodapé e Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-9 cursor-pointer"
            >
              Fechar
            </Button>

            <div className="flex items-center gap-2">
              {isMember ? (
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl text-xs h-9 font-semibold gap-1.5 shadow-sm"
                >
                  <Link to="/projetos/$id" params={{ id: project.id }}>
                    {isOwner ? "Acessar Gestão do Squad" : "Acessar Workspace"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : closed ? (
                <Button
                  disabled
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-9 cursor-not-allowed opacity-70"
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Projeto Finalizado
                </Button>
              ) : (
                onApplyClick && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onApplyClick();
                    }}
                    className="rounded-xl text-xs h-9 font-semibold gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Candidatar-se ao Squad
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

