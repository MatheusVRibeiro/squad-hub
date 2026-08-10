import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Github, Link2, Unlink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProjectGithubStatus,
  getInstallationRepositories,
  connectProjectRepository,
  disconnectProjectRepository,
  type InstallationRepository,
} from "@/services/github";

type Props = {
  projectId: string | number;
  isOwner: boolean;
};

/**
 * Painel de conexão do projeto com um repositório GitHub (ETAPA 5).
 * Estados: loading | não conectado | conectado | erro | permissão insuficiente.
 */
export function GithubProjectPanel({ projectId, isOwner }: Props) {
  const queryClient = useQueryClient();
  const [installationId, setInstallationId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("montesquad_installation_id");
      return saved ? Number(saved) : null;
    }
    return null;
  });
  const [repoId, setRepoId] = useState<string>("");
  const [listing, setListing] = useState(false);
  const [repos, setRepos] = useState<InstallationRepository[]>([]);
  const [repoError, setRepoError] = useState<string | null>(null);

  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["project-github-status", String(projectId)],
    queryFn: () => getProjectGithubStatus(projectId),
  });

  const connect = useMutation({
    mutationFn: () =>
      connectProjectRepository(projectId, {
        installationId: installationId!,
        repositoryId: Number(repoId),
      }),
    onSuccess: () => {
      toast.success("Repositório conectado ao projeto!");
      queryClient.invalidateQueries({ queryKey: ["project-github-status", String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ["project", String(projectId)] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectProjectRepository(projectId),
    onSuccess: () => {
      toast.success("Repositório desconectado (tarefas preservadas).");
      queryClient.invalidateQueries({ queryKey: ["project-github-status", String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ["project", String(projectId)] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function carregarRepos() {
    if (!installationId) return;
    setListing(true);
    setRepoError(null);
    try {
      const lista = await getInstallationRepositories(installationId);
      setRepos(lista);
      if (lista.length === 0) setRepoError("Nenhum repositório autorizado para esta instalação.");
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Erro ao listar repositórios.");
    } finally {
      setListing(false);
    }
  }

  useEffect(() => {
    if (installationId !== null) {
      localStorage.setItem("montesquad_installation_id", String(installationId));
      carregarRepos();
    } else {
      localStorage.removeItem("montesquad_installation_id");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installationId]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão GitHub...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-2xl border-destructive/40">
        <CardContent className="py-5">
          <p className="text-sm font-semibold text-destructive">
            Não foi possível verificar a conexão GitHub
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="mt-3 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status?.conectado) {
    return (
      <Card className="rounded-2xl border-border/60 bg-emerald-500/5">
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Github className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                  {status.github_repository_full_name}
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Conectado
                  </Badge>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Branch padrão: {status.github_default_branch || "main"} ·{" "}
                  {status.github_connected_at
                    ? `conectado em ${new Date(status.github_connected_at).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
              </div>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
                className="cursor-pointer"
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="py-5">
          <p className="text-sm text-muted-foreground">
            Este projeto ainda não está conectado ao GitHub. Somente o proprietário pode conectar um
            repositório.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Conectar repositório GitHub</p>
            <p className="text-xs text-muted-foreground">
              Vincule um repositório para rastrear branches, commits e Pull Requests nas tarefas.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Installation ID (da GitHub App)
            </label>
            <a
              href="https://github.com/apps/montessquad/installations/new"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Autorizar no GitHub ↗
            </a>
          </div>
          <input
            type="number"
            value={installationId ?? ""}
            onChange={(e) => setInstallationId(e.target.value ? Number(e.target.value) : null)}
            placeholder="Ex: 51234567"
            className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10px] text-muted-foreground leading-snug">
            Caso já tenha autorizado, o ID é preenchido automaticamente de forma segura via cache local.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Repositório
          </label>
          <Select value={repoId} onValueChange={setRepoId}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue
                placeholder={
                  installationId !== null
                    ? "Carregue os repositórios"
                    : "Informe o Installation ID primeiro"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {repos.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {repoError && <p className="text-xs text-destructive">{repoError}</p>}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={installationId === null || listing}
            onClick={carregarRepos}
            className="cursor-pointer"
          >
            {listing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Carregar repositórios
          </Button>
          <Button
            size="sm"
            disabled={!installationId || !repoId || connect.isPending}
            onClick={() => connect.mutate()}
            className="cursor-pointer"
          >
            {connect.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Conectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
