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
    <div className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-3 backdrop-blur sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome ou descrição..."
          className="h-10 rounded-xl pl-9"
          aria-label="Buscar projetos"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select value={technology} onValueChange={onTechnologyChange}>
          <SelectTrigger className="h-10 rounded-xl sm:w-40" aria-label="Tecnologia">
            <SelectValue placeholder="Tecnologia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as techs</SelectItem>
            {technologies.map((tech) => (
              <SelectItem key={tech} value={tech}>
                {tech}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus | "all")}>
          <SelectTrigger className="h-10 rounded-xl sm:w-36" aria-label="Status">
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
          <SelectTrigger className="col-span-2 h-10 rounded-xl sm:w-44" aria-label="Ordenação">
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