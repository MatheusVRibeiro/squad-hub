import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { KanbanStatus } from "@/services/projectDetail";
import {
  DEFAULT_KANBAN_FILTERS,
  kanbanFiltersAtivos,
  type KanbanFilterState,
} from "@/types/kanbanFilters";

const STATUS_OPTIONS: { value: KanbanStatus; label: string }[] = [
  { value: "todo", label: "A fazer" },
  { value: "doing", label: "Em progresso" },
  { value: "review", label: "Em revisão" },
  { value: "done", label: "Concluídas" },
];

const PRIORITY_OPTIONS: { value: "low" | "medium" | "high"; label: string }[] = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

/**
 * ETAPA 7 (Kanban escalável) — Drawer lateral de filtros avançados.
 * Usa o Sheet do design system; compartilha a MESMA fonte de estado
 * (`KanbanFilterState`) da toolbar — nenhum filtro duplicado com lógica
 * diferente. "Limpar" por seção afeta apenas a seção; "Limpar todos"
 * restaura o estado inicial.
 */
export function KanbanFiltersDrawer({
  filters,
  onFiltersChange,
  assigneeOptions,
}: {
  filters: KanbanFilterState;
  onFiltersChange: (next: KanbanFilterState) => void;
  assigneeOptions: string[];
}) {
  const set = (patch: Partial<KanbanFilterState>) => onFiltersChange({ ...filters, ...patch });
  const ativos = kanbanFiltersAtivos(filters);

  const toggleStatus = (value: KanbanStatus) =>
    set({
      statuses: filters.statuses.includes(value)
        ? filters.statuses.filter((s) => s !== value)
        : [...filters.statuses, value],
    });

  const togglePriority = (value: "low" | "medium" | "high") =>
    set({
      priorities: filters.priorities.includes(value)
        ? filters.priorities.filter((p) => p !== value)
        : [...filters.priorities, value],
    });

  const toggleAssignee = (name: string) =>
    set({
      assignees: filters.assignees.includes(name)
        ? filters.assignees.filter((a) => a !== name)
        : [...filters.assignees, name],
    });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 rounded-xl border-border/60 bg-background/40 px-3 text-xs font-medium",
            ativos ? "border-primary/40 text-primary" : "text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
          Mais filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Combine filtros para reduzir o volume de tarefas visíveis.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Status */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Status
              </h3>
              {filters.statuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => set({ statuses: [] })}
                  className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  checked={filters.statuses.includes(opt.value)}
                  onCheckedChange={() => toggleStatus(opt.value)}
                  aria-label={`Filtrar por status ${opt.label}`}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </section>

          {/* Prioridade */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Prioridade
              </h3>
              {filters.priorities.length > 0 && (
                <button
                  type="button"
                  onClick={() => set({ priorities: [] })}
                  className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            {PRIORITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  checked={filters.priorities.includes(opt.value)}
                  onCheckedChange={() => togglePriority(opt.value)}
                  aria-label={`Filtrar por prioridade ${opt.label}`}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </section>

          {/* Responsável */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Responsável
              </h3>
              {filters.assignees.length > 0 && (
                <button
                  type="button"
                  onClick={() => set({ assignees: [] })}
                  className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                type="text"
                placeholder="Buscar responsável..."
                aria-label="Buscar responsável"
                className="h-9 rounded-xl border-border/60 bg-background/40 pl-8 text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-muted/40">
              <Checkbox
                checked={filters.unassigned}
                onCheckedChange={(checked) => set({ unassigned: checked === true })}
                aria-label="Filtrar tarefas sem responsável"
              />
              <span className="text-sm">Sem responsável</span>
            </label>
            {assigneeOptions.map((name) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  checked={filters.assignees.includes(name)}
                  onCheckedChange={() => toggleAssignee(name)}
                  aria-label={`Filtrar por responsável ${name}`}
                />
                <span className="text-sm">{name}</span>
              </label>
            ))}
          </section>

          {/* Outros */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Outros
              </h3>
              {(filters.overdue || filters.hasDueDate) && (
                <button
                  type="button"
                  onClick={() => set({ overdue: false, hasDueDate: false })}
                  className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-muted/40">
              <Checkbox
                checked={filters.overdue}
                onCheckedChange={(checked) => set({ overdue: checked === true })}
                aria-label="Filtrar tarefas atrasadas"
              />
              <span className="text-sm">Atrasadas</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-muted/40">
              <Checkbox
                checked={filters.hasDueDate}
                onCheckedChange={(checked) => set({ hasDueDate: checked === true })}
                aria-label="Filtrar tarefas com prazo"
              />
              <span className="text-sm">Com prazo</span>
            </label>
          </section>

          <div className="space-y-2 border-t pt-4">
            <Button
              type="button"
              className="w-full rounded-xl"
              onClick={() => onFiltersChange({ ...filters })}
            >
              Aplicar filtros
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => onFiltersChange(DEFAULT_KANBAN_FILTERS)}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpar todos
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
