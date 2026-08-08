import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCheck,
  ClipboardCheck,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  markAllRead,
  type AppNotification,
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
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  // Garante "mais recentes primeiro" mesmo se a ordem da API variar.
  const notifications = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onMutate: () => {
      queryClient.setQueryData<AppNotification[]>(["notifications"], (old) =>
        (old ?? []).map((n) => ({ ...n, read: true })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas as notificações foram marcadas como lidas.");
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.error("Não foi possível marcar as notificações como lidas.");
    },
  });

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Atividades</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notificações</h1>
            </div>
            {!isLoading && !isError && unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                {markAllMutation.isPending ? "Marcando..." : "Marcar todas como lidas"}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <Card className="rounded-2xl border-destructive/40">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Não foi possível carregar as notificações.</p>
                  <p className="text-xs text-muted-foreground">
                    {error instanceof Error
                      ? error.message
                      : "Verifique sua conexão e tente novamente."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isFetching && "animate-spin")} />
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma notificação ainda.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => {
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
                return <li key={n.id}>{n.link ? <Link to={n.link}>{content}</Link> : content}</li>;
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
