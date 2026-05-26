import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Megaphone,
  MessageSquare,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  type NotificationType,
} from "@/services/notifications";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  application: UserPlus,
  approved: ClipboardCheck,
  message: MessageSquare,
  task: Megaphone,
  system: Sparkles,
};

function NotificacoesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Atividades</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notificações</h1>
          </div>

          {isLoading || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma notificação ainda.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {data.map((n) => {
                const Icon = ICONS[n.type];
                const content = (
                  <Card className="rounded-2xl border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                    <CardContent className="flex gap-3 p-4">
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                          n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className={cn("text-sm", n.read ? "font-normal" : "font-medium")}>
                            {n.title}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
                return (
                  <li key={n.id}>
                    {n.link ? <Link to={n.link}>{content}</Link> : content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/notificacoes")({
  component: NotificacoesPage,
});