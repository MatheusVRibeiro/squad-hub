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

/** ETAPA 6: valores do filtro de prioridade ("all" = sem filtro). */
export type PriorityFilterValue = "all" | "low" | "medium" | "high";

/**
 * ETAPA 6 — Toolbar de filtros do Kanban.
 * Filtros 100% visuais (estado local do KanbanBoard): busca por título,
 * responsável e prioridade. Não altera persistência nem chama o backend.
 */
export function KanbanToolbar({
  search,
  onSearchChange,
  assigneeOptions,
  assigneeFilter,
  onAssigneeChange,
  priorityFilter,
  onPriorityChange,
  resultCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  assigneeOptions: string[];
  assigneeFilter: string;
  onAssigneeChange: (value: string) => void;
  priorityFilter: PriorityFilterValue;
  onPriorityChange: (value: PriorityFilterValue) => void;
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          type="text"
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar tarefas por título"
          className="h-9 rounded-xl border-border/60 bg-background/40 pl-9 pr-8 text-xs focus-visible:ring-primary/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
        <SelectTrigger
          aria-label="Filtrar por responsável"
          className="h-9 w-[170px] rounded-xl border-border/60 bg-background/40 text-xs"
        >
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {assigneeOptions.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={priorityFilter}
        onValueChange={(value) => onPriorityChange(value as PriorityFilterValue)}
      >
        <SelectTrigger
          aria-label="Filtrar por prioridade"
          className="h-9 w-[140px] rounded-xl border-border/60 bg-background/40 text-xs"
        >
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
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
