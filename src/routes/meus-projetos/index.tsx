import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, FolderKanban, Sparkles, Compass } from "lucide-react";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectsSkeleton } from "@/components/projects/states";
import { fetchProjects } from "@/services/projects";
import { useAuth } from "@/contexts/AuthContext";

function MeusProjetosPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  });

  // A2: dono por ID (creatorId mapeado de criador_id do backend), não por nome —
  // homônimos não quebram. `createdBy === "Você"` mantém o preview DEV (mock/recém-criado).
  const mine = (data ?? []).filter(
    (p) => Number(p.creatorId) === Number(user?.id) || p.createdBy === "Você",
  );

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6 py-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold tracking-widest text-primary uppercase">Workspace</p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Meus projetos</h1>
              <p className="text-sm text-muted-foreground">
                Squads que você criou e gerencia como proprietário.
              </p>
            </div>
            <Button asChild className="rounded-xl px-5 shadow-sm">
              <Link to="/projetos/novo">
                <Plus className="mr-1.5 h-4 w-4" /> Novo projeto
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <ProjectsSkeleton />
          ) : mine.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center backdrop-blur-sm">
              <div className="relative mb-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <FolderKanban className="h-8 w-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-border/60 bg-background text-primary shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Nenhum squad criado ainda
              </h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Você ainda não criou nenhum projeto na plataforma. Crie seu primeiro squad para montar sua equipe e gerenciar tarefas.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="rounded-xl px-5 shadow-sm">
                  <Link to="/projetos/novo">
                    <Plus className="mr-1.5 h-4 w-4" /> Criar primeiro projeto
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl px-4">
                  <Link to="/projetos">
                    <Compass className="mr-1.5 h-4 w-4" /> Explorar outros squads
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/meus-projetos/")({
  component: MeusProjetosPage,
});
