import { useEffect, useState } from "react";
import { LogOut, Search, User, Trophy, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function ConfettiEffect() {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-indigo-500",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {Array.from({ length: 45 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 2}s`;
        const duration = `${1.5 + Math.random() * 2}s`;
        const size = i % 2 === 0 ? "w-2.5 h-2.5" : "w-1.5 h-3.5 rotate-45";
        return (
          <div
            key={i}
            className={cn("absolute -top-4 rounded-sm opacity-80", color, size)}
            style={{
              left,
              animationDelay: delay,
              animationDuration: duration,
              animationName: "fall",
              animationIterationCount: "infinite",
              animationTimingFunction: "linear",
            }}
          />
        );
      })}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(450px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [levelUpData, setLevelUpData] = useState<{ level: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLevelUp = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nextLevel = customEvent.detail?.level;
      setLevelUpData({ level: nextLevel });

      // Invalida a query de reputação para atualizar XP/Level no cabeçalho e dashboard instantaneamente
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
    };

    window.addEventListener("squadhub:levelup", handleLevelUp);
    return () => {
      window.removeEventListener("squadhub:levelup", handleLevelUp);
    };
  }, [queryClient]);

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "MS";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
            <SidebarTrigger />

            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-tight">
                {greeting()}, {user?.name?.split(" ")[0] ?? "dev"} 👋
              </p>
            </div>

            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const term = searchTerm.trim();
                navigate({ to: "/projetos", search: term ? { q: term } : {} });
              }}
              className="relative ml-auto hidden md:block"
            >
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Busca global"
                placeholder="Buscar projetos, pessoas..."
                className="h-9 w-64 rounded-xl pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            <div className="ml-auto md:ml-0">
              <NotificationsMenu />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                  aria-label="Menu do perfil"
                >
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/perfil" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Meu perfil
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <Dialog open={levelUpData !== null} onOpenChange={(open) => !open && setLevelUpData(null)}>
        <DialogContent className="rounded-3xl max-w-sm border border-border/50 bg-card/95 backdrop-blur-md shadow-2xl p-6 overflow-hidden">
          <ConfettiEffect />
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-5 relative z-10">
            <motion.div
              initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0], opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, duration: 0.8 }}
              className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-lg shadow-amber-500/20"
            >
              <Trophy className="h-10 w-10 animate-pulse" />
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-300 animate-bounce" />
            </motion.div>

            <div className="space-y-2">
              <DialogTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                LEVEL UP!
              </DialogTitle>
              <p className="text-3xl font-black text-foreground">Nível {levelUpData?.level}</p>
              <DialogDescription className="text-xs text-muted-foreground max-w-xs px-2 leading-relaxed">
                Parabéns! Você concluiu tarefas com sucesso e subiu de nível. Continue assim para
                conquistar ainda mais espaço e reputação na comunidade!
              </DialogDescription>
            </div>

            <Button
              onClick={() => setLevelUpData(null)}
              className="rounded-xl px-8 h-10 text-xs font-bold shadow-md w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
