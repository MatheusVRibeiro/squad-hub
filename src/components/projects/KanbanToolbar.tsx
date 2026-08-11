import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KanbanFilterState } from "@/types/kanbanFilters";

/**
 * ETAPA 5 (Kanban escalável) — Toolbar de filtros do Kanban.
 * Consome a fonte única de verdade (`KanbanFilterState`) via `filters`/
 * `onFiltersChange`. Filtros 100% visuais (estado local do KanbanBoard);
 * não alteram persistência nem chamam o backend.
 */
export function KanbanToolbar({
  filters,
  onFiltersChange,
  assigneeOptions,
  resultCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
}: {
  filters: KanbanFilterState;
  onFiltersChange: (next: KanbanFilterState) => void;
  assigneeOptions: string[];
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const set = (patch: Partial<KanbanFilterState>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          type="text"
          placeholder="Buscar por título, descrição ou ID..."
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-label="Buscar tarefas por título, descrição ou ID"
          className="h-9 rounded-xl border-border/60 bg-background/40 pl-9 pr-8 text-xs focus-visible:ring-ring"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => set({ search: "" })}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Select
        value={filters.assignees.length === 1 ? filters.assignees[0] : "__all__"}
        onValueChange={(value) => set({ assignees: value === "__all__" ? [] : [value] })}
      >
        <SelectTrigger
          aria-label="Filtrar por responsável"
          className="h-9 w-[170px] rounded-xl border-border/60 bg-background/40 text-xs"
        >
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {assigneeOptions.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priorities.length === 1 ? filters.priorities[0] : "__all__"}
        onValueChange={(value) =>
          set({ priorities: value === "__all__" ? [] : [value as "low" | "medium" | "high"] })
        }
      >
        <SelectTrigger
          aria-label="Filtrar por prioridade"
          className="h-9 w-[140px] rounded-xl border-border/60 bg-background/40 text-xs"
        >
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
        </SelectContent>
      </Select>

      <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
        {resultCount} de {totalCount} tarefas
      </span>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
