import axios from "axios";
import { api } from "./api";

export type Committer = {
  userId: string | null;
  name: string;
  githubLogin: string | null;
  avatarUrl: string | null;
  commitCount: number;
};

type ApiEnvelope<T> = { sucesso: boolean; message?: string; dados: T | null };

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/** GET /projetos/:id/rankings/committers — top committers do projeto (ETAPA 11). */
export async function getProjectCommitters(
  projectId: string | number,
  limit = 5,
): Promise<Committer[]> {
  try {
    const { data } = await api.get<ApiEnvelope<Committer[]>>(
      `/projetos/${projectId}/rankings/committers`,
      {
        params: { limit },
      },
    );
    if (!data.sucesso) throw new Error(data.message || "Falha ao buscar ranking");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar top committers do projeto.");
  }
}

/** GET /rankings/committers — top committers global (ETAPA 12). */
export async function getGlobalCommitters(
  limit = 10,
  period: "all" | "month" = "all",
): Promise<Committer[]> {
  try {
    const { data } = await api.get<ApiEnvelope<Committer[]>>("/rankings/committers", {
      params: { limit, period },
    });
    if (!data.sucesso) throw new Error(data.message || "Falha ao buscar ranking global");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar top committers global.");
  }
}

// ── Top Contributors (ETAPAS 13-14) ───────────────────────────────────────

export type Contributor = {
  userId: string | null;
  name: string;
  githubLogin: string | null;
  avatarUrl: string | null;
  score: number;
  commitCount: number;
  prsAbertos: number;
  prsMergeados: number;
  tasksVerificadas: number;
};

/** GET /projetos/:id/rankings/contributors — top contributors do projeto (ETAPA 13). */
export async function getProjectContributors(
  projectId: string | number,
  limit = 10,
): Promise<Contributor[]> {
  try {
    const { data } = await api.get<ApiEnvelope<Contributor[]>>(
      `/projetos/${projectId}/rankings/contributors`,
      {
        params: { limit },
      },
    );
    if (!data.sucesso) throw new Error(data.message || "Falha ao buscar ranking");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar top contributors do projeto.");
  }
}

/** GET /rankings/contributors — top contributors global (ETAPA 14). */
export async function getGlobalContributors(
  limit = 10,
  period: "all" | "month" = "all",
): Promise<Contributor[]> {
  try {
    const { data } = await api.get<ApiEnvelope<Contributor[]>>("/rankings/contributors", {
      params: { limit, period },
    });
    if (!data.sucesso) throw new Error(data.message || "Falha ao buscar ranking global");
    return data.dados ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao buscar top contributors global.");
  }
}
