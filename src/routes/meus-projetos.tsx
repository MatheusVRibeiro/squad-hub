import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

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

  const mine = (data ?? []).filter(
    (p) => p.createdBy === user?.name || p.createdBy === "Você",
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
            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 p-12 text-center backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">
                Você ainda não criou nenhum projeto na plataforma.
              </p>
              <Button asChild className="mt-4 rounded-xl shadow-sm">
                <Link to="/projetos/novo">
                  <Plus className="mr-1.5 h-4 w-4" /> Criar primeiro projeto
                </Link>
              </Button>
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

export const Route = createFileRoute("/meus-projetos")({
  component: MeusProjetosPage,
});