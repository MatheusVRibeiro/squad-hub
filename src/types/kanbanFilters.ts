import type { KanbanStatus } from "@/services/projectDetail";

/**
 * ETAPA 5 (refatoração Kanban escalável) — fonte única de verdade para os
 * filtros do Kanban. Substitui os vários useState isolados (searchTerm,
 * assigneeFilter, priorityFilter) por uma estrutura coerente. Todos os
 * filtros derivam deste estado; nada é mantido duplicado.
 */
export type KanbanFilterState = {
  search: string;
  statuses: KanbanStatus[];
  priorities: ("low" | "medium" | "high")[];
  assignees: string[];
  onlyMine: boolean;
  unassigned: boolean;
  overdue: boolean;
  hasDueDate: boolean;
};

/** Estado inicial — sem filtros ativos (todas as colunas visíveis). */
export const DEFAULT_KANBAN_FILTERS: KanbanFilterState = {
  search: "",
  statuses: [],
  priorities: [],
  assignees: [],
  onlyMine: false,
  unassigned: false,
  overdue: false,
  hasDueDate: false,
};

/** True quando qualquer filtro está ativo (para contadores "X de Y" e UI). */
export function kanbanFiltersAtivos(f: KanbanFilterState): boolean {
  return (
    f.search.trim() !== "" ||
    f.statuses.length > 0 ||
    f.priorities.length > 0 ||
    f.assignees.length > 0 ||
    f.onlyMine ||
    f.unassigned ||
    f.overdue ||
    f.hasDueDate
  );
}
