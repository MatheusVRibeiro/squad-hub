import axios from "axios";
import { api } from "./api";

// ── Cadastro/login com GitHub (Evolução ETAPA 1) ──────────────────────────

export type GithubAuthUrl = {
  url: string;
  state: string;
};

export type GithubProfilePayload = {
  nome?: string;
  bio?: string;
  localizacao?: string;
  senha?: string;
};

export type GithubAuthUser = {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  bio?: string | null;
  localizacao?: string | null;
  avatar_url?: string | null;
  github_login?: string | null;
  github_avatar_url?: string | null;
  cadastro_origem?: string;
};

export type CompleteGithubProfileResult = {
  token: string;
  dados: GithubAuthUser;
};

type ApiEnvelope<T> = { sucesso: boolean; message?: string; dados?: T | null };

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/**
 * GET /auth/github — inicia o fluxo de cadastro/login com GitHub.
 * Retorna a URL de autorização OAuth (com state anti-CSRF) para onde o
 * navegador deve ser redirecionado.
 */
export async function getGithubAuthUrl(): Promise<GithubAuthUrl> {
  try {
    const { data } = await api.get<ApiEnvelope<GithubAuthUrl>>("/auth/github");
    if (!data.sucesso || !data.dados || !data.dados.url)
      throw new Error(data.message || "Falha ao gerar URL de autorização");
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao iniciar o login com GitHub.");
  }
}

/**
 * POST /auth/github/complete-profile — completa o perfil do usuário recém
 * criado via GitHub (nome obrigatório no form; bio/localização/senha opcionais).
 * O token do callback é passado explicitamente (Bearer) porque ainda não foi
 * persistido na sessão quando a tela de onboarding é exibida.
 */
export async function completeGithubProfile(
  payload: GithubProfilePayload,
  token: string,
): Promise<CompleteGithubProfileResult> {
  try {
    const { data } = await api.post<ApiEnvelope<GithubAuthUser> & { token?: string }>(
      "/auth/github/complete-profile",
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!data.sucesso || !data.token || !data.dados)
      throw new Error(data.message || "Não foi possível completar o perfil");
    return { token: data.token, dados: data.dados };
  } catch (err) {
    throw toFriendlyError(err, "Erro ao completar seu perfil.");
  }
}
