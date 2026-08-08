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

type ApiEnvelope<T> = { sucesso: boolean; message?: string; dados: T | null };

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
