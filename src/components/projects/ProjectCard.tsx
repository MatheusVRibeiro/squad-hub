import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Project, requestProjectJoin } from "@/services/projects";

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
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const closed = project.status === "Finalizado";

  async function handleJoin() {
    setState("loading");
    try {
      await requestProjectJoin(project.id);
      setState("sent");
      toast.success(`Solicitação enviada para ${project.name}`);
    } catch {
      setState("idle");
      toast.error("Não foi possível enviar a solicitação");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
    >
      <Card className="group flex h-full flex-col rounded-2xl border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Link
              to="/projetos/$id"
              params={{ id: project.id }}
              className="line-clamp-1 text-base font-semibold leading-tight hover:text-primary"
            >
              {project.name}
            </Link>
            <Badge variant="outline" className={cn("shrink-0 rounded-full text-xs", statusStyles[project.status])}>
              {project.status}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        </CardHeader>

        <CardContent className="space-y-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.map((tech) => (
              <Badge key={tech} variant="secondary" className="rounded-full text-[11px] font-medium">
                {tech}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {project.membersCount}/{project.membersLimit} membros
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(project.createdAt)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Criado por</p>
            <p className="truncate text-xs font-medium">{project.createdBy}</p>
          </div>
          <Button
            size="sm"
            variant={state === "sent" ? "secondary" : "default"}
            disabled={state !== "idle" || closed}
            onClick={handleJoin}
            className="rounded-xl"
          >
            {state === "loading" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {state === "sent" && <Check className="mr-1.5 h-3.5 w-3.5" />}
            {state === "sent"
              ? "Solicitação enviada"
              : closed
                ? "Encerrado"
                : state === "loading"
                  ? "Enviando..."
                  : "Solicitar entrada"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}