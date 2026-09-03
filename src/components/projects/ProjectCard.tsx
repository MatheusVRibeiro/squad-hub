import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Check, Loader2, Users, User } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Project } from "@/services/projects";
import { useAuth } from "@/contexts/AuthContext";
import { getLocalProjectDetail, applyToProjectLocal } from "@/services/projectDetail";
import { notificationsIntegration } from "@/services/notificationsIntegration";
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

const statusStyles: Record<Project["status"], string> = {
  Aberto: "bg-primary/10 text-primary border-primary/20",
  "Em andamento": "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  Finalizado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState(user?.bio || "");
  const [applySkills, setApplySkills] = useState(user?.skills?.join(", ") || "");
  const [localApplied, setLocalApplied] = useState(false);

  const closed = project.status === "Finalizado";

  // Busca detalhes locais para carregar status offline do relacionamento com o usuário
  const detail = typeof window !== "undefined" ? getLocalProjectDetail(project.id) : null;
  const isOwner = project.createdBy === user?.name || project.createdBy === "Você";
  const isMember = detail
    ? isOwner ||
      detail.members.some(
        (m) => m.name === user?.name || (m.name === "Você" && user?.name === "Você"),
      )
    : isOwner;

  const application = detail?.applications.find(
    (a) => a.name === user?.name || (a.name === "Você" && user?.name === "Você"),
  );
  const hasApplied = !!application && application.status === "pending";
  const isRejected = !!application && application.status === "rejected";
  const hasAppliedFinal = hasApplied || localApplied;

  // Cálculo da barra de lotação
  const percentFilled = Math.round((project.membersCount / project.membersLimit) * 100);

  // Cálculo de compatibilidade de Stack (Skills)
  const matchingSkills = project.technologies.filter((tech) =>
    user?.skills?.some((skill) => skill.toLowerCase() === tech.toLowerCase()),
  );
  const matchPercent =
    project.technologies.length > 0
      ? Math.round((matchingSkills.length / project.technologies.length) * 100)
      : 0;

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applyMessage.trim()) {
      toast.error("Por favor, digite uma mensagem de apresentação.");
      return;
    }

    setIsApplying(true);
    try {
      const skillsArray = applySkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await applyToProjectLocal(project.id, {
        name: user?.name || "Usuário",
        message: applyMessage.trim(),
        skills: skillsArray,
      });

      // Dispara as notificações
      notificationsIntegration.notifyApplied(project.name, user?.name || "Usuário", project.id);

      // Invalida os dados do cache global do React Query
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      setLocalApplied(true);
      setIsSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar candidatura.");
    } finally {
      setIsApplying(false);
    }
  }

  const footerButton = (() => {
    if (closed) {
      return (
        <Button disabled variant="outline" size="sm" className="rounded-xl h-9 text-xs">
          Encerrado
        </Button>
      );
    }
    if (isOwner) {
      return (
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="rounded-xl h-9 text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-semibold shadow-sm"
        >
          <Link to="/projetos/$id" params={{ id: project.id }}>
            Gerenciar
          </Link>
        </Button>
      );
    }
    if (isMember) {
      return (
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="rounded-xl h-9 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-semibold shadow-sm"
        >
          <Link to="/projetos/$id" params={{ id: project.id }}>
            Ver Squad
          </Link>
        </Button>
      );
    }
    if (hasAppliedFinal) {
      return (
        <Button
          disabled
          variant="outline"
          size="sm"
          className="rounded-xl h-9 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold"
        >
          Pendente
        </Button>
      );
    }
    if (isRejected) {
      return (
        <Button
          disabled
          variant="outline"
          size="sm"
          className="rounded-xl h-9 text-xs bg-destructive/10 text-destructive border-destructive/20 font-semibold"
        >
          Recusado
        </Button>
      );
    }

    // Caso seja visitante: abre o Dialog de Candidatura Rápida
    return (
      <Dialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setTimeout(() => setIsSuccess(false), 200);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" className="rounded-xl h-9 text-xs shadow-sm font-semibold">
            Solicitar entrada
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-3xl max-w-md border border-border/60 bg-card/98 backdrop-blur shadow-2xl p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
              >
                <Check className="h-8 w-8 stroke-[3]" />
              </motion.div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Solicitação Enviada!
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground max-w-sm px-4 leading-relaxed">
                  Sua apresentação e habilidades foram enviadas para o criador do projeto{" "}
                  <strong>{project.name}</strong>. Você será avisado no painel quando seu pedido for
                  avaliado.
                </DialogDescription>
              </div>
              <Button
                onClick={() => setOpen(false)}
                className="rounded-xl px-6 h-10 text-xs font-semibold shadow-sm"
              >
                Entendido
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Candidatar-se ao Squad
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Apresente-se para o proprietário de <strong>{project.name}</strong> para ingressar
                  neste projeto.
                </DialogDescription>
              </DialogHeader>

              {/* Análise de compatibilidade de Stack */}
              <div className="rounded-2xl border border-border/50 bg-muted/25 p-4 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Compatibilidade de Stack</span>
                  <span className="text-primary">{matchPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary to-purple-600 transition-all duration-500"
                    style={{ width: `${matchPercent}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {project.technologies.map((tech) => {
                    const matched = user?.skills?.some(
                      (skill) => skill.toLowerCase() === tech.toLowerCase(),
                    );
                    return (
                      <Badge
                        key={tech}
                        variant="outline"
                        className={cn(
                          "rounded-full text-[9px] font-bold tracking-wide py-0.5 px-2.5 flex items-center gap-1.5 border",
                          matched
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {matched ? "✓" : "○"} {tech}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Formulário */}
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="message"
                    className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                  >
                    Mensagem de Apresentação
                  </Label>
                  <Textarea
                    id="message"
                    required
                    placeholder="Olá! Sou desenvolvedor e posso ajudar..."
                    className="rounded-xl border-border/60 bg-background/40 p-3 text-sm focus-visible:ring-primary/20 resize-none text-xs leading-relaxed"
                    rows={3}
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="skills"
                    className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide"
                  >
                    Habilidades (separadas por vírgula)
                  </Label>
                  <Input
                    id="skills"
                    placeholder="React, Node.js, Git..."
                    className="h-10 rounded-xl border-border/60 bg-background/40 px-3 text-xs focus-visible:ring-primary/20"
                    value={applySkills}
                    onChange={(e) => setApplySkills(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-border/20">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="rounded-xl h-10 px-4 text-xs font-medium"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isApplying}
                    className="rounded-xl h-10 px-5 text-xs font-semibold shadow-sm"
                  >
                    {isApplying ? "Enviando..." : "Confirmar e Enviar"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
    >
      <Card className="group flex h-full flex-col rounded-3xl border-border/60 bg-linear-to-b from-card to-card/98 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg dark:to-card/95">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Link
              to="/projetos/$id"
              params={{ id: project.id }}
              className="line-clamp-1 text-base font-semibold leading-tight hover:text-primary"
            >
              {project.name}
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className={cn("rounded-full text-xs", statusStyles[project.status])}
              >
                {project.status}
              </Badge>
            </div>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {project.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.map((tech) => (
              <Badge
                key={tech}
                variant="secondary"
                className="rounded-full text-[11px] font-medium border"
              >
                {tech}
              </Badge>
            ))}
          </div>

          {/* Barra de progresso de lotação de membros */}
          <div className="space-y-1.5 border-t border-border/10 pt-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground/80" />
                {project.membersCount}/{project.membersLimit} membros
              </span>
              <span>{percentFilled}% ocupado</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden border border-border/10">
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

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
            <span>Criado em {formatDate(project.createdAt)}</span>
          </div>
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
              Criado por
            </p>
            <p className="truncate text-xs font-semibold text-foreground/90">{project.createdBy}</p>
          </div>
          {footerButton}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
