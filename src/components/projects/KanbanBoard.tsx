import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { KanbanStatus, KanbanTask } from "@/services/projectDetail";

const COLUMNS: { key: KanbanStatus; label: string; tone: string }[] = [
  { key: "todo", label: "A fazer", tone: "bg-muted text-foreground" },
  { key: "doing", label: "Em progresso", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { key: "done", label: "Concluído", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
];

export function KanbanBoard({ initial }: { initial: KanbanTask[] }) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initial);
  const [draftCol, setDraftCol] = useState<KanbanStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  function move(id: string, status: KanbanStatus) {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  function add(status: KanbanStatus) {
    if (!draft.trim()) return;
    setTasks((t) => [
      ...t,
      { id: `local-${Date.now()}`, title: draft.trim(), status },
    ]);
    toast.success("Tarefa criada");
    setDraft("");
    setDraftCol(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) move(dragId, col.key);
              setDragId(null);
            }}
            className="flex min-h-[200px] flex-col gap-3 rounded-2xl border bg-muted/30 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", col.tone)}>
                  {col.label}
                </span>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDraftCol(col.key)}
                aria-label={`Adicionar em ${col.label}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {list.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className="cursor-grab rounded-xl border-border/60 p-3 text-sm shadow-sm hover:border-primary/40 active:cursor-grabbing"
                  >
                    <p className="font-medium leading-snug">{t.title}</p>
                    {t.assignee && (
                      <Badge variant="secondary" className="mt-2 rounded-full text-[10px]">
                        {t.assignee}
                      </Badge>
                    )}
                  </Card>
                </motion.div>
              ))}

              {draftCol === col.key && (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed bg-background p-2">
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") add(col.key);
                      if (e.key === "Escape") {
                        setDraftCol(null);
                        setDraft("");
                      }
                    }}
                    placeholder="Título da tarefa"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 rounded-lg" onClick={() => add(col.key)}>
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-lg"
                      onClick={() => {
                        setDraftCol(null);
                        setDraft("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}