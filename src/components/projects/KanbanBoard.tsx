import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { addLocalTask, updateLocalTaskStatus, type KanbanStatus, type KanbanTask } from "@/services/projectDetail";
import { notificationsIntegration } from "@/services/notificationsIntegration";

const COLUMNS: { key: KanbanStatus; label: string; tone: string; borderTone: string }[] = [
  { key: "todo", label: "A fazer", tone: "bg-muted/80 text-muted-foreground border border-muted-foreground/10", borderTone: "border-l-muted-foreground/40" },
  { key: "doing", label: "Em progresso", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20", borderTone: "border-l-amber-500" },
  { key: "done", label: "Concluído", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20", borderTone: "border-l-emerald-500" },
];

export function KanbanBoard({ 
  initial, 
  projectId, 
  projectName, 
  readOnly 
}: { 
  initial: KanbanTask[]; 
  projectId: string; 
  projectName: string; 
  readOnly?: boolean; 
}) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initial);
  const [draftCol, setDraftCol] = useState<KanbanStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  async function move(id: string, status: KanbanStatus) {
    if (readOnly) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const oldStatus = task.status;
    if (oldStatus === status) return;

    // 1. Persiste localmente
    await updateLocalTaskStatus(projectId, id, status);

    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));

    // 2. Dispara notificação
    const colName = COLUMNS.find(c => c.key === status)?.label || status;
    notificationsIntegration.notifyTaskActivity(projectName, task.title, "moved", colName, projectId);
  }

  async function add(status: KanbanStatus) {
    if (readOnly) return;
    const taskTitle = draft.trim();
    if (!taskTitle) return;

    // 1. Persiste localmente
    const createdTask = await addLocalTask(projectId, taskTitle);

    setTasks((t) => [...t, createdTask]);
    toast.success("Tarefa criada");
    setDraft("");
    setDraftCol(null);

    // 2. Dispara notificação
    notificationsIntegration.notifyTaskActivity(projectName, taskTitle, "created", "", projectId);
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              if (!readOnly) e.preventDefault();
            }}
            onDrop={() => {
              if (readOnly) return;
              if (dragId) move(dragId, col.key);
              setDragId(null);
            }}
            className={cn(
              "flex min-h-[450px] flex-col gap-4 rounded-2xl border border-border/50 bg-card/45 p-4 backdrop-blur-sm transition-all duration-300",
              dragId ? "border-primary/20 bg-primary/5/10 shadow-sm" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide shadow-sm", col.tone)}>
                  {col.label}
                </span>
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-muted/40 px-1 text-[10px] font-medium text-muted-foreground">
                  {list.length}
                </span>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => setDraftCol(col.key)}
                  aria-label={`Adicionar em ${col.label}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {list.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    draggable={!readOnly}
                    onDragStart={() => !readOnly && setDragId(t.id)}
                    onDragEnd={() => !readOnly && setDragId(null)}
                    className={cn(
                      "group relative overflow-hidden border-l-4 border-y border-r border-border/60 bg-card/90 p-4 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                      col.borderTone,
                      !readOnly ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    )}
                  >
                    <p className="font-medium leading-snug text-foreground/90 group-hover:text-foreground">{t.title}</p>
                    {t.assignee && (
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide">
                          {t.assignee}
                        </Badge>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}

              {draftCol === col.key && (
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-background/80 p-3 shadow-inner backdrop-blur-sm">
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
                    placeholder="Título da tarefa..."
                    className="h-9 rounded-xl border-border/60 bg-background/50 text-sm focus-visible:ring-primary/30"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-xl text-xs"
                      onClick={() => {
                        setDraftCol(null);
                        setDraft("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" className="h-8 rounded-xl text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-medium" onClick={() => add(col.key)}>
                      Adicionar
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