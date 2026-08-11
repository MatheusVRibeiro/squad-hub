import { useCallback, useEffect, useState } from "react";
import { Github, KeyRound, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getUserGithubStatus,
  getGithubConnectUrl,
  disconnectGithubAccount,
  ERRO_SENHA_NECESSARIA,
  type UserGithubStatus,
} from "@/services/github";

export type GithubConnectionState = "carregando" | "nao-conectado" | "conectado" | "erro";

function rolarParaSecaoSenha() {
  if (typeof document !== "undefined") {
    document.getElementById("seguranca")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Card de integração GitHub (ETAPA 2 — Configurações > Integrações).
 * Estados: carregando → não conectado → conectado | erro.
 * Regra de negócio: conta criada via GitHub sem senha local NÃO pode
 * desconectar (backend responde 409) — o card orienta o usuário a definir
 * a senha (seção Segurança & Credenciais) antes de desconectar.
 */
export function GitHubConnectionCard() {
  const [status, setStatus] = useState<UserGithubStatus | null>(null);
  const [estado, setEstado] = useState<GithubConnectionState>("carregando");
  const [busy, setBusy] = useState(false);
  const [pedeSenha, setPedeSenha] = useState(false);
  const [installationIdFromUrl, setInstallationIdFromUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = new URLSearchParams(window.location.search).get("installation_id");
      if (id) {
        setInstallationIdFromUrl(id);
      }
    }
  }, []);

  const carregar = useCallback(() => {
    setEstado("carregando");
    getUserGithubStatus()
      .then((s) => {
        setStatus(s);
        setEstado(s.conectado ? "conectado" : "nao-conectado");
        setPedeSenha(false);
      })
      .catch(() => {
        setStatus(null);
        setEstado("erro");
      });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleConnect() {
    setBusy(true);
    try {
      const { url } = await getGithubConnectUrl();
      // Redireciona para o GitHub; o callback volta para /configuracoes?github=connected
      window.location.href = url;
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Erro ao conectar GitHub");
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectGithubAccount();
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              conectado: false,
              github_user_id: null,
              github_login: null,
              github_avatar_url: null,
              github_connected_at: null,
            }
          : prev,
      );
      setEstado("nao-conectado");
      setPedeSenha(false);
      toast.success("GitHub desconectado (histórico preservado)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao desconectar GitHub";
      if (message === ERRO_SENHA_NECESSARIA) {
        setPedeSenha(true);
        toast.error(message, {
          action: { label: "Definir senha", onClick: rolarParaSecaoSenha },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900/5 text-neutral-900 dark:bg-neutral-100/10 dark:text-neutral-100">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground/90">Conta GitHub</CardTitle>
            <CardDescription className="text-xs">
              Vincule sua conta GitHub para que commits e Pull Requests das suas tarefas sejam
              atribuídos automaticamente a você.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 border-t border-border/20 px-6 py-5">
        {installationIdFromUrl && (
          <Alert className="rounded-xl border-emerald-500/40 bg-emerald-500/5">
            <AlertDescription className="text-xs text-muted-foreground">
              🚀 <strong>Instalação concluída com sucesso!</strong>
              <br />
              Seu ID de Instalação é:{" "}
              <strong className="text-foreground text-sm font-mono">{installationIdFromUrl}</strong>
              <br />
              Copie e guarde este número para conectar os repositórios nos seus projetos.
            </AlertDescription>
          </Alert>
        )}
        {estado === "carregando" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando vínculo...
          </div>
        )}

        {estado === "erro" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Não foi possível verificar o vínculo com o GitHub.
            </p>
            <Button size="sm" variant="ghost" onClick={carregar} className="cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {estado === "conectado" && status && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {status.github_avatar_url ? (
                <img
                  src={status.github_avatar_url}
                  alt={status.github_login || "GitHub"}
                  className="h-10 w-10 rounded-full border border-border/60"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-900/5 text-neutral-900 dark:bg-neutral-100/10 dark:text-neutral-100">
                  <Github className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-foreground">@{status.github_login}</p>
                <p className="text-xs text-muted-foreground">
                  Conectado{" "}
                  {status.github_connected_at
                    ? `em ${new Date(status.github_connected_at).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={handleDisconnect}
              className="cursor-pointer"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
              Desconectar
            </Button>
          </div>
        )}

        {estado === "nao-conectado" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Sua conta ainda não está vinculada ao GitHub.
            </p>
            <Button size="sm" disabled={busy} onClick={handleConnect} className="cursor-pointer">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              Conectar com GitHub
            </Button>
          </div>
        )}

        {/* 409 do backend: precisa definir senha antes de desconectar */}
        {pedeSenha && (
          <Alert className="rounded-xl border-destructive/40 bg-destructive/5">
            <AlertDescription className="flex items-start gap-2 text-xs text-muted-foreground">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <span>
                Crie uma senha local antes de desconectar o GitHub.{" "}
                <button
                  type="button"
                  onClick={rolarParaSecaoSenha}
                  className="font-semibold text-primary underline underline-offset-2 cursor-pointer"
                >
                  Definir senha na seção Segurança & Credenciais
                </button>
              </span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
