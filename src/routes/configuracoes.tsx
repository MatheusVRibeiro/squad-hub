import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings, Moon, Sun, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function ConfiguracoesPage() {
  const { user, updateUser } = useAuth();
  
  // 1. Controle de Tema (Dark Mode)
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDarkClass = document.documentElement.classList.contains("dark");
      setIsDark(isDarkClass);
    }
  }, []);

  function toggleTheme(checked: boolean) {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (checked) {
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
        setIsDark(true);
        toast.success("Modo escuro ativado");
      } else {
        root.classList.remove("dark");
        localStorage.setItem("theme", "light");
        setIsDark(false);
        toast.success("Modo claro ativado");
      }
    }
  }



  // 3. Reset de Dados da Plataforma
  function handleResetData() {
    if (!window.confirm("Aviso: Isso irá redefinir todos os projetos criados, Kanban, mensagens e notificações para o estado inicial de demonstração. Deseja prosseguir?")) {
      return;
    }

    try {
      // Remove todas as chaves criadas locais
      localStorage.removeItem("@montesquad:projects");
      localStorage.removeItem("@montesquad:notifications");
      
      // Procura e remove chaves de detalhes de projetos
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("@montesquad:project-detail:")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      toast.success("Dados redefinidos com sucesso! Recarregando...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error("Erro ao redefinir dados");
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl space-y-6 py-2">
          <div className="space-y-1">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Conta</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Configurações</h1>
          </div>

          <div className="space-y-6">
            {/* Tema e Aparência */}
            <Card className="rounded-3xl border border-border/50 bg-card/65 shadow-md backdrop-blur-md">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground/90">Aparência</CardTitle>
                    <CardDescription className="text-xs">Gerencie as configurações visuais e preferências de tema.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between border-t border-border/30 px-6 py-5">
                <div className="space-y-0.5 max-w-[80%]">
                  <Label htmlFor="dark-mode-switch" className="text-sm font-semibold text-foreground/90">Modo Escuro</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">Alterna a interface do MonteSquad entre os temas claro e escuro para melhor conforto visual.</p>
                </div>
                <Switch
                  id="dark-mode-switch"
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="scale-95"
                />
              </CardContent>
            </Card>

            {/* Gerenciamento de Armazenamento Local */}
            <Card className="rounded-3xl border border-destructive/25 bg-card/65 shadow-md shadow-destructive/5 backdrop-blur-md">
              <CardHeader className="bg-destructive/5 border-b border-destructive/10 rounded-t-3xl px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-destructive">Zona de Perigo</CardTitle>
                    <CardDescription className="text-xs text-destructive/80">Ações destrutivas e irreversíveis sobre os dados da sua conta local.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 gap-4">
                <div className="space-y-0.5 max-w-[80%]">
                  <Label className="text-sm font-semibold text-destructive/90">Redefinir Dados Locais</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">Apaga permanentemente todos os projetos criados por você, tarefas Kanban, mensagens do mural e histórico de notificações locais, restaurando os projetos de demonstração originais.</p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleResetData}
                  className="rounded-xl flex items-center justify-center gap-1.5 h-10 px-4 font-semibold text-xs transition-colors shrink-0 shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Redefinir dados
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/configuracoes")({
  component: ConfiguracoesPage,
});