import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Application } from "@/services/projectDetail";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Applications({ initial }: { initial: Application[] }) {
  const [items, setItems] = useState<Application[]>(initial);

  function decide(id: string, status: "approved" | "rejected") {
    setItems((arr) => arr.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(status === "approved" ? "Candidatura aprovada" : "Candidatura recusada");
  }

  const pending = items.filter((a) => a.status === "pending");
  const handled = items.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Pendentes ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Nenhuma candidatura pendente no momento.
          </Card>
        ) : (
          <div className="grid gap-3">
            {pending.map((a) => (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="flex flex-col gap-4 rounded-2xl border-border/60 p-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-start gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials(a.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{a.message}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => decide(a.id, "approved")}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
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
          <h3 className="text-sm font-semibold text-muted-foreground">Histórico</h3>
          <div className="grid gap-2">
            {handled.map((a) => (
              <Card
                key={a.id}
                className="flex items-center justify-between rounded-xl border-border/60 px-4 py-3 text-sm"
              >
                <span className="font-medium">{a.name}</span>
                <Badge
                  variant="outline"
                  className={
                    a.status === "approved"
                      ? "rounded-full border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "rounded-full border-destructive/30 text-destructive"
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