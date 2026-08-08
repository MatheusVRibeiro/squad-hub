import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateLocalApplicationStatus, type Application } from "@/services/projectDetail";
import { notificationsIntegration } from "@/services/notificationsIntegration";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Applications({
  initial,
  projectId,
  projectName,
}: {
  initial: Application[];
  projectId: string;
  projectName: string;
}) {
  const [items, setItems] = useState<Application[]>(initial);

  async function decide(id: string, status: "approved" | "rejected") {
    const app = items.find((a) => a.id === id);
    if (!app) return;

    try {
      // 1. Persiste via serviço (lança Error em falha)
      await updateLocalApplicationStatus(projectId, id, status);

      setItems((arr) => arr.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(status === "approved" ? "Candidatura aprovada" : "Candidatura recusada");

      // 2. Envia notificação
      notificationsIntegration.notifyApplicationStatus(projectName, app.name, status, projectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar candidatura.");
    }
  }

  const pending = items.filter((a) => a.status === "pending");
  const handled = items.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Pendentes ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/80 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            Nenhuma candidatura pendente no momento.
          </Card>
        ) : (
          <div className="grid gap-3">
            {pending.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/65 p-5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                  <div className="flex flex-1 items-start gap-4">
                    <Avatar className="h-11 w-11 border shadow-inner">
                      <AvatarFallback className="bg-gradient-to-tr from-primary/10 to-primary/20 text-primary text-xs font-semibold">
                        {initials(a.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm font-semibold text-foreground/90">{a.name}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.message}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {a.skills.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="rounded-full text-[10px] font-medium tracking-wide"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col sm:w-32">
                    <Button
                      size="sm"
                      className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-xs h-9"
                      onClick={() => decide(a.id, "approved")}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/35 font-medium text-xs h-9"
                      onClick={() => decide(a.id, "rejected")}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Recusar
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Histórico
          </h3>
          <div className="grid gap-2.5">
            {handled.map((a) => (
              <Card
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card/45 px-4 py-3 text-sm shadow-sm backdrop-blur-sm"
              >
                <span className="font-semibold text-foreground/80">{a.name}</span>
                <Badge
                  variant="outline"
                  className={
                    a.status === "approved"
                      ? "rounded-full border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]"
                      : "rounded-full border-destructive/30 bg-destructive/5 text-destructive font-semibold text-[10px]"
                  }
                >
                  {a.status === "approved" ? "Aprovado" : "Recusado"}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
