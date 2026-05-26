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
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Workspace</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meus projetos</h1>
              <p className="text-sm text-muted-foreground">
                Squads que você criou ou administra.
              </p>
            </div>
            <Button asChild className="rounded-xl">
              <Link to="/projetos/novo">
                <Plus className="mr-1.5 h-4 w-4" /> Novo projeto
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <ProjectsSkeleton />
          ) : mine.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Você ainda não criou nenhum projeto.
              </p>
              <Button asChild className="mt-4 rounded-xl">
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