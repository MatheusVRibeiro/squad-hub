import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectStatus } from "@/services/projects";

export type SortKey = "recent" | "oldest" | "name" | "members";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTechs: string[];
  onSelectedTechsChange: (value: string[]) => void;
  status: ProjectStatus | "all";
  onStatusChange: (value: ProjectStatus | "all") => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  technologies: string[];
};

export function ProjectsToolbar({
  search,
  onSearchChange,
  selectedTechs,
  onSelectedTechsChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  technologies,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-card/65 p-4 shadow-md backdrop-blur-md">
      {/* Main search and select filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="h-11 rounded-xl border border-border/60 bg-background/40 pl-10 pr-4 text-sm focus-visible:ring-primary/20"
            aria-label="Buscar projetos"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center">
          <Select value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus | "all")}>
            <SelectTrigger
              className="h-11 rounded-xl border border-border/60 bg-background/40 text-sm focus-visible:ring-primary/20 sm:w-40"
              aria-label="Status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Em andamento">Em andamento</SelectItem>
              <SelectItem value="Finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
            <SelectTrigger
              className="col-span-2 h-11 rounded-xl border border-border/60 bg-background/40 text-sm focus-visible:ring-primary/20 sm:w-44"
              aria-label="Ordenação"
            >
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="members">Mais membros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Horizontal wrapping technologies filter tags */}
      {technologies.length > 0 && (
        <div className="border-t border-border/20 pt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Filtrar por tecnologias
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => onSelectedTechsChange([])}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold tracking-wide border transition-all cursor-pointer outline-none",
                selectedTechs.length === 0
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background/40 border-border/80 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
              )}
            >
              Todas
            </button>
            {technologies.map((tech) => {
              const active = selectedTechs.includes(tech);
              return (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    if (active) {
                      onSelectedTechsChange(selectedTechs.filter((t) => t !== tech));
                    } else {
                      onSelectedTechsChange([...selectedTechs, tech]);
                    }
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold tracking-wide border transition-all cursor-pointer outline-none",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background/40 border-border/80 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                  )}
                >
                  {tech}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
