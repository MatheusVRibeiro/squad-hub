import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectsToolbar, type SortKey } from "@/components/projects/ProjectsToolbar";
import { ProjectsEmpty, ProjectsError, ProjectsSkeleton } from "@/components/projects/states";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchProjects, type Project, type ProjectStatus } from "@/services/projects";

function ExplorarProjetosPage() {
  const [search, setSearch] = useState("");
  const [technology, setTechnology] = useState<string>("all");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const debouncedSearch = useDebouncedValue(search, 250);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  });

  const technologies = useMemo(() => {
    const all = new Set<string>();
    (data ?? []).forEach((p) => p.technologies.forEach((t) => all.add(t)));
    return Array.from(all).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    let list: Project[] = (data ?? []).filter((p) => {
      const matchesTerm =
        !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
      const matchesTech = technology === "all" || p.technologies.includes(technology);
      const matchesStatus = status === "all" || p.status === status;
      return matchesTerm && matchesTech && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "members":
          return b.membersCount - a.membersCount;
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "recent":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [data, debouncedSearch, technology, status, sort]);

  function resetFilters() {
    setSearch("");
    setTechnology("all");
    setStatus("all");
    setSort("recent");
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-1"
          >
            <p className="text-sm text-muted-foreground">Comunidade</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Explorar projetos
            </h1>
            <p className="text-sm text-muted-foreground">
              Encontre squads abertos e solicite entrada para colaborar.
            </p>
          </motion.div>

          <ProjectsToolbar
            search={search}
            onSearchChange={setSearch}
            technology={technology}
            onTechnologyChange={setTechnology}
            status={status}
            onStatusChange={setStatus}
            sort={sort}
            onSortChange={setSort}
            technologies={technologies}
          />

          {isLoading ? (
            <ProjectsSkeleton />
          ) : isError ? (
            <ProjectsError onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <ProjectsEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>
                  {filtered.length} {filtered.length === 1 ? "projeto" : "projetos"}
                </span>
                {isFetching && <span>Atualizando...</span>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/projetos")({
  component: ExplorarProjetosPage,
});