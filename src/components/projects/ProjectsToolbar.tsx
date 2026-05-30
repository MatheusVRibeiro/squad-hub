import { Search } from "lucide-react";

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
  technology: string;
  onTechnologyChange: (value: string) => void;
  status: ProjectStatus | "all";
  onStatusChange: (value: ProjectStatus | "all") => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  technologies: string[];
};

export function ProjectsToolbar({
  search,
  onSearchChange,
  technology,
  onTechnologyChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  technologies,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/50 bg-card/65 p-4 shadow-md backdrop-blur-md sm:flex-row sm:items-center">
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
        <Select value={technology} onValueChange={onTechnologyChange}>
          <SelectTrigger className="h-11 rounded-xl border border-border/60 bg-background/40 text-sm focus-visible:ring-primary/20 sm:w-44" aria-label="Tecnologia">
            <SelectValue placeholder="Tecnologia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tecnologias</SelectItem>
            {technologies.map((tech) => (
              <SelectItem key={tech} value={tech}>
                {tech}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus | "all")}>
          <SelectTrigger className="h-11 rounded-xl border border-border/60 bg-background/40 text-sm focus-visible:ring-primary/20 sm:w-40" aria-label="Status">
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
          <SelectTrigger className="col-span-2 h-11 rounded-xl border border-border/60 bg-background/40 text-sm focus-visible:ring-primary/20 sm:w-44" aria-label="Ordenação">
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
  );
}