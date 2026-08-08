import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings, Moon, Sun, Lock, Bell, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

function ConfiguracoesPage() {
  const { user, signOut } = useAuth();

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

  // 2. Segurança - Mudar Senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setUpdatingPass(true);
    try {
      await api.patch(`/usuarios/${user.id}`, { senha: newPassword });
      toast.success("Senha atualizada com sucesso");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? ((err.response.data as { message?: string }).message ?? "Erro ao atualizar senha")
          : "Erro ao atualizar senha";
      toast.error(message);
    } finally {
      setUpdatingPass(false);
    }
  }

  // 3. Preferências de Notificações
  const [notifSquad, setNotifSquad] = useState(true);
  const [notifMural, setNotifMural] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifSquad(localStorage.getItem("@montesquad:notif_squad") !== "false");
      setNotifMural(localStorage.getItem("@montesquad:notif_mural") !== "false");
      setNotifWeekly(localStorage.getItem("@montesquad:notif_weekly") === "true");
    }
  }, []);

  function handleToggleNotif(key: string, value: boolean, setter: (val: boolean) => void) {
    setter(value);
    localStorage.setItem(key, String(value));
    toast.success("Preferência de notificação salva");
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl space-y-6 py-2">
          <div className="space-y-1">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Conta</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Configurações</h1>
          </div>

          <div className="space-y-6">
            {/* TEMA E APARÊNCIA */}
            <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    {isDark ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground/90">
                      Aparência
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gerencie as configurações visuais e preferências de tema.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between border-t border-border/20 px-6 py-5">
                <div className="space-y-0.5 max-w-[80%]">
                  <Label
                    htmlFor="dark-mode-switch"
                    className="text-sm font-semibold text-foreground/90 cursor-pointer"
                  >
                    Modo Escuro
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Alterna a interface do MonteSquad entre os temas claro e escuro para melhor
                    conforto visual.
                  </p>
                </div>
                <Switch
                  id="dark-mode-switch"
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="scale-95 cursor-pointer"
                />
              </CardContent>
            </Card>

            {/* PREFERÊNCIAS DE NOTIFICAÇÕES */}
            <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground/90">
                      Preferências de Notificações
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Defina como quer receber novidades e atualizações sobre seus squads.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="divide-y divide-border/20 px-6 py-0 border-t border-border/20">
                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label
                      htmlFor="notif-squad"
                      className="text-sm font-semibold text-foreground/90 cursor-pointer"
                    >
                      Convites de Squads
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Receba notificações e avisos quando for convidado ou aprovado em um squad.
                    </p>
                  </div>
                  <Switch
                    id="notif-squad"
                    checked={notifSquad}
                    onCheckedChange={(checked) =>
                      handleToggleNotif("@montesquad:notif_squad", checked, setNotifSquad)
                    }
                    className="scale-95 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label
                      htmlFor="notif-mural"
                      className="text-sm font-semibold text-foreground/90 cursor-pointer"
                    >
                      Mensagens do Mural
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Seja avisado na plataforma sempre que alguém postar no mural de mensagens do
                      seu squad.
                    </p>
                  </div>
                  <Switch
                    id="notif-mural"
                    checked={notifMural}
                    onCheckedChange={(checked) =>
                      handleToggleNotif("@montesquad:notif_mural", checked, setNotifMural)
                    }
                    className="scale-95 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5 max-w-[80%]">
                    <Label
                      htmlFor="notif-weekly"
                      className="text-sm font-semibold text-foreground/90 cursor-pointer"
                    >
                      Resumo Semanal
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Receba por e-mail um relatório semanal consolidando o progresso das tarefas e
                      XP acumulado.
                    </p>
                  </div>
                  <Switch
                    id="notif-weekly"
                    checked={notifWeekly}
                    onCheckedChange={(checked) =>
                      handleToggleNotif("@montesquad:notif_weekly", checked, setNotifWeekly)
                    }
                    className="scale-95 cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEGURANÇA (MUDAR SENHA) */}
            <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground/90">
                      Segurança & Credenciais
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Atualize suas credenciais de segurança e senha de acesso.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="border-t border-border/20 px-6 py-5">
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-password"
                      className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                    >
                      Nova Senha
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 rounded-xl border border-border/60 bg-background px-4 focus-visible:ring-primary/20 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                    >
                      Confirmar Nova Senha
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl border border-border/60 bg-background px-4 focus-visible:ring-primary/20 text-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updatingPass}
                    className="rounded-xl flex items-center justify-center gap-1.5 h-10 px-4 font-semibold text-xs shadow-sm cursor-pointer"
                  >
                    {updatingPass ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Atualizar Senha
                  </Button>
                </form>
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
