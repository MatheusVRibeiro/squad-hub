import axios from "axios";
import { api } from "./api";

export type ProjectGithubStatus = {
  conectado: boolean;
  github_repository_id: number | null;
  github_repository_full_name: string | null;
  github_installation_id: number | null;
  github_default_branch: string | null;
  github_connected_at: string | null;
  repositorio_url: string | null;
};

export type InstallationRepository = {
  id: number;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
};

export type UserGithubStatus = {
  conectado: boolean;
  github_user_id: number | null;
  github_login: string | null;
  github_avatar_url: string | null;
  github_connected_at: string | null;
};

type ApiEnvelope<T> = { sucesso: boolean; message?: string; dados: T | null };

/** Mensagem do backend (409) quando conta criada via GitHub ainda não tem senha local. */
export const ERRO_SENHA_NECESSARIA = "Crie uma senha local antes de desconectar o GitHub";

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/** GET /projetos/:id/github/status — status da conexão do projeto. */
export async function getProjectGithubStatus(
  projectId: string | number,
): Promise<ProjectGithubStatus> {
  try {
    const { data } = await api.get<ApiEnvelope<ProjectGithubStatus>>(
      `/projetos/${projectId}/github/status`,
    );
    if (!data.sucesso || !data.dados)
      throw new Error(data.message || "Falha ao buscar status GitHub");
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar status GitHub do projeto.");
  }
}

/** GET /github/installations/:installationId/repositories — repositórios da instalação. */
export async function getInstallationRepositories(
  installationId: number,
): Promise<InstallationRepository[]> {
  try {
    const { data } = await api.get<ApiEnvelope<InstallationRepository[]>>(
      `/github/installations/${installationId}/repositories`,
    );
    if (!data.sucesso) throw new Error(data.message || "Falha ao listar repositórios");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao listar repositórios da instalação.");
  }
}

/** POST /projetos/:id/github/repository — conecta repositório ao projeto (owner). */
export async function connectProjectRepository(
  projectId: string | number,
  payload: { installationId: number; repositoryId: number },
): Promise<ProjectGithubStatus> {
  try {
    const { data } = await api.post<ApiEnvelope<ProjectGithubStatus>>(
      `/projetos/${projectId}/github/repository`,
      payload,
    );
    if (!data.sucesso || !data.dados)
      throw new Error(data.message || "Falha ao conectar repositório");
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao conectar repositório.");
  }
}

/** DELETE /projetos/:id/github/repository — desconecta repositório (owner). */
export async function disconnectProjectRepository(projectId: string | number): Promise<void> {
  try {
    const { data } = await api.delete<ApiEnvelope<null>>(
      `/projetos/${projectId}/github/repository`,
    );
    if (!data.sucesso) throw new Error(data.message || "Falha ao desconectar repositório");
  } catch (err) {
    throw toFriendlyError(err, "Erro ao desconectar repositório.");
  }
}

// ── Identidade GitHub do usuário (ETAPA 6) ────────────────────────────────

/** GET /github/me — estado de conexão do usuário autenticado. */
export async function getUserGithubStatus(): Promise<UserGithubStatus> {
  try {
    const { data } = await api.get<ApiEnvelope<UserGithubStatus>>("/github/me");
    if (!data.sucesso || !data.dados)
      throw new Error(data.message || "Falha ao buscar status GitHub");
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar status GitHub.");
  }
}

/** GET /github/connect — retorna a URL OAuth (com state anti-CSRF) para conectar. */
export async function getGithubConnectUrl(): Promise<{ url: string; state: string }> {
  try {
    const { data } = await api.get<ApiEnvelope<{ url: string; state: string }>>("/github/connect");
    if (!data.sucesso || !data.dados)
      throw new Error(data.message || "Falha ao gerar URL de conexão");
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao gerar URL de conexão GitHub.");
  }
}

/** DELETE /github/disconnect — remove o vínculo (histórico preservado). */
export async function disconnectGithubAccount(): Promise<void> {
  try {
    const { data } = await api.delete<ApiEnvelope<null>>("/github/disconnect");
    if (!data.sucesso) throw new Error(data.message || "Falha ao desconectar GitHub");
  } catch (err) {
    throw toFriendlyError(err, "Erro ao desconectar GitHub.");
  }
}

// ── Atividade GitHub da tarefa (ETAPA 8) ──────────────────────────────────

export type TaskGithubStatus = {
  github_branch: string | null;
  github_pr_number: number | null;
  github_pr_url: string | null;
  github_pr_status: string | null;
  github_last_activity_at: string | null;
  completion_source: string | null;
  completed_at: string | null;
};

export type TaskCommit = {
  sha: string;
  sha_curto: string;
  mensagem: string;
  autor: string;
  login: string | null;
  email: string | null;
  url: string | null;
  commit_em: string | null;
  branch: string | null;
};

/** GET /projetos/:id/tarefas/:tarefaId/github — status GitHub da task. */
export async function getTaskGithubStatus(
  projectId: string | number,
  taskId: string | number,
): Promise<TaskGithubStatus> {
  try {
    const { data } = await api.get<ApiEnvelope<TaskGithubStatus>>(
      `/projetos/${projectId}/tarefas/${taskId}/github`,
    );
    if (!data.sucesso || !data.dados)
      throw new Error(data.message || "Falha ao buscar status GitHub");
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar status GitHub da tarefa.");
  }
}

/** GET /projetos/:id/tarefas/:tarefaId/commits — commits da branch da task. */
export async function getTaskCommits(
  projectId: string | number,
  taskId: string | number,
): Promise<TaskCommit[]> {
  try {
    const { data } = await api.get<ApiEnvelope<TaskCommit[]>>(
      `/projetos/${projectId}/tarefas/${taskId}/commits`,
    );
    if (!data.sucesso) throw new Error(data.message || "Falha ao listar commits");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao listar commits da tarefa.");
  }
}

// ── Timeline técnica da tarefa (ETAPA 15) ─────────────────────────────────

export type TimelineEvent = {
  tipo:
    | "assumida"
    | "branch"
    | "commit"
    | "pr_open"
    | "pr_closed"
    | "pr_merged"
    | "concluida"
    | string;
  titulo: string;
  detalhe: string | null;
  sha?: string | null;
  autor?: string | null;
  url?: string | null;
  quando: string | null;
};

/** GET /projetos/:id/tarefas/:tarefaId/timeline — timeline derivada da task. */
export async function getTaskTimeline(
  projectId: string | number,
  taskId: string | number,
): Promise<TimelineEvent[]> {
  try {
    const { data } = await api.get<ApiEnvelope<TimelineEvent[]>>(
      `/projetos/${projectId}/tarefas/${taskId}/timeline`,
    );
    if (!data.sucesso) throw new Error(data.message || "Falha ao carregar timeline");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao carregar timeline da tarefa.");
  }
}
