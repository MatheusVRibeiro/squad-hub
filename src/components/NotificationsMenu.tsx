import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Megaphone,
  MessageSquare,
  Sparkles,
  UserPlus,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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

function fromNow(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "agora";
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} d`;
}

export function NotificationsMenu() {
  const queryClient = useQueryClient();

  // Contador de não lidas REAL: derivado dos dados retornados por GET /notificacoes.
  // Em caso de erro a query fica sem dados e o badge não é exibido (nada de mock).
  const { data, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });

  const items: AppNotification[] = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onMutate: () => {
      queryClient.setQueryData<AppNotification[]>(["notifications"], (old) =>
        (old ?? []).map((n) => ({ ...n, read: true })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.error("Não foi possível marcar as notificações como lidas.");
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} não lidas` : "Você está em dia"}
            </p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="h-8 rounded-lg text-xs"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Marcar como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[380px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {isError
                ? "Não foi possível carregar as notificações."
                : "Nenhuma notificação por aqui."}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = ICONS[n.type];
                const body = (
                  <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <span
                      className={cn(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                        n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn("truncate text-sm", n.read ? "font-normal" : "font-medium")}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {fromNow(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.description}
                      </p>
                    </div>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link to={n.link} className="block">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
