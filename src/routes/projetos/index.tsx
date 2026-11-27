import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectsToolbar, type SortKey } from "@/components/projects/ProjectsToolbar";
import { ProjectsEmpty, ProjectsError, ProjectsSkeleton } from "@/components/projects/states";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchProjects, type Project, type ProjectStatus } from "@/services/projects";

type ProjetosSearch = {
  /** Termo da busca global (AppLayout) — filtra por nome/descrição. */
  q?: string;
};

function validateProjetosSearch(search: Record<string, unknown>): ProjetosSearch {
  return {
    q: typeof search.q === "string" && search.q.trim().length > 0 ? search.q.trim() : undefined,
  };
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;

  let qIdx = 0;
  for (let tIdx = 0; tIdx < t.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
      if (qIdx === q.length) return true;
    }
  }
  return false;
}

function ExplorarProjetosPage() {
  const { q } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const debouncedSearch = useDebouncedValue(search, 250);

  // Sincroniza o termo da busca global (?q=) com o campo de busca da toolbar,
  // que já filtra por nome/descrição (fuzzyMatch) no useMemo abaixo.
  useEffect(() => {
    setSearch(q ?? "");
  }, [q]);

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
    const term = debouncedSearch.trim();
    let list: Project[] = (data ?? []).filter((p) => {
      const matchesTerm = !term || fuzzyMatch(p.name, term) || fuzzyMatch(p.description, term);
      const matchesTech =
        selectedTechs.length === 0 || selectedTechs.every((tech) => p.technologies.includes(tech));
      const matchesStatus = status === "all" || p.status === status;
      return matchesTerm && matchesTech && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      // Prioridade por status: abertos e em andamento primeiro, finalizados por último
      const pesoStatus = (st: string) => {
        const s = st?.toLowerCase();
        if (s === "aberto") return 1;
        if (s === "em andamento" || s === "em_andamento") return 2;
        if (s === "finalizado") return 3;
        return 4;
      };

      const pesoA = pesoStatus(a.status);
      const pesoB = pesoStatus(b.status);

      if (pesoA !== pesoB) {
        return pesoA - pesoB;
      }

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
  }, [data, debouncedSearch, selectedTechs, status, sort]);

  // Reseta para a primeira página sempre que os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedTechs, status, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  function resetFilters() {
    setSearch("");
    setSelectedTechs([]);
    setStatus("all");
    setSort("recent");
    setCurrentPage(1);
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6 py-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-1.5"
          >
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Comunidade</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Explorar projetos
            </h1>
            <p className="text-sm text-muted-foreground">
              Encontre squads abertos, analise as vagas e solicite entrada para colaborar.
            </p>
          </motion.div>

          <ProjectsToolbar
            search={search}
            onSearchChange={setSearch}
            selectedTechs={selectedTechs}
            onSelectedTechsChange={setSelectedTechs}
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
                  Mostrando {paginatedProjects.length} de {filtered.length} {filtered.length === 1 ? "projeto" : "projetos"}
                  {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
                </span>
                {isFetching && <span>Atualizando...</span>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedProjects.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) {
                              setCurrentPage((p) => p - 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={`cursor-pointer ${currentPage === 1 ? "pointer-events-none opacity-40" : ""}`}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNumber = idx + 1;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              isActive={currentPage === pageNumber}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNumber);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) {
                              setCurrentPage((p) => p + 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={`cursor-pointer ${currentPage === totalPages ? "pointer-events-none opacity-40" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/projetos/")({
  validateSearch: validateProjetosSearch,
  component: ExplorarProjetosPage,
});
