import axios from "axios";
import { api } from "./api";

export type NivelHabilidade = "iniciante" | "intermediario" | "avancado";
export type NivelInteresse = "baixo" | "medio" | "alto";

export type Funcao = {
  id: number;
  nome: string;
};

export type FuncaoUsuario = {
  id: number;
  nome: string;
  nivel_interesse: NivelInteresse;
};

export type HabilidadeComNivel = {
  id: number;
  nome: string;
  nivel: NivelHabilidade;
};

/** Perfil técnico completo (GET /usuarios/me/perfil) — ETAPA 3. */
export type PerfilTecnico = {
  id: number;
  nome: string;
  email: string;
  bio?: string | null;
  localizacao?: string | null;
  avatar_url?: string | null;
  tipo?: string;
  disponibilidade_horas_semana?: number | null;
  objetivo_profissional?: string | null;
  perfil_completo: boolean;
  habilidades: HabilidadeComNivel[];
  funcoes: FuncaoUsuario[];
};

export type FuncaoInteresseInput = {
  nome: string;
  nivel_interesse: NivelInteresse;
};

export type HabilidadeNivelInput = {
  nome: string;
  nivel: NivelHabilidade;
};

/** Payload do PATCH /usuarios/me/perfil (parcial — só envia o que mudou). */
export type AtualizarPerfilTecnicoPayload = {
  nome?: string;
  bio?: string;
  localizacao?: string;
  avatarUrl?: string;
  disponibilidade_horas_semana?: number;
  objetivo_profissional?: string;
  funcoes?: FuncaoInteresseInput[];
  habilidades?: HabilidadeNivelInput[];
};

type ApiEnvelope<T = unknown> = {
  sucesso: boolean;
  message?: string;
  nItens?: number;
  dados?: T;
};

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/** GET /funcoes — lista global de funções de interesse (autenticado). */
export async function getFuncoes(): Promise<Funcao[]> {
  try {
    const { data } = await api.get<ApiEnvelope<Funcao[]>>("/funcoes");
    if (data.sucesso && Array.isArray(data.dados)) return data.dados;
    return [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao carregar funções.");
  }
}

/**
 * GET /usuarios/me/perfil — perfil técnico completo do usuário autenticado
 * (dados básicos + habilidades com nível + funções com nível de interesse).
 */
export async function getMeuPerfilTecnico(): Promise<PerfilTecnico> {
  try {
    const { data } = await api.get<ApiEnvelope<PerfilTecnico>>("/usuarios/me/perfil");
    if (!data.sucesso || !data.dados) {
      throw new Error(data.message || "Não foi possível carregar seu perfil técnico.");
    }
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao carregar perfil técnico. Tente novamente.");
  }
}

/**
 * PATCH /usuarios/me/perfil — atualiza os campos técnicos (disponibilidade,
 * objetivo) e os dados básicos. O backend recalcula `perfil_completo` e
 * retorna o perfil atualizado em `dados`.
 */
export async function atualizarPerfilTecnico(
  payload: AtualizarPerfilTecnicoPayload,
): Promise<PerfilTecnico> {
  try {
    const { data } = await api.patch<ApiEnvelope<PerfilTecnico>>("/usuarios/me/perfil", {
      nome: payload.nome,
      bio: payload.bio,
      localizacao: payload.localizacao,
      avatar_url: payload.avatarUrl,
      disponibilidade_horas_semana: payload.disponibilidade_horas_semana,
      objetivo_profissional: payload.objetivo_profissional,
      funcoes: payload.funcoes,
      habilidades: payload.habilidades,
    });
    if (!data.sucesso || !data.dados) {
      throw new Error(data.message || "Não foi possível atualizar o perfil técnico.");
    }
    return data.dados;
  } catch (err) {
    throw toFriendlyError(err, "Erro ao salvar perfil técnico. Tente novamente.");
  }
}

/**
 * PUT /usuarios/me/funcoes — substituição total das funções de interesse do
 * usuário (com nível de interesse). Retorna a lista salva em `dados.funcoes`.
 */
export async function salvarFuncoes(funcoes: FuncaoInteresseInput[]): Promise<FuncaoUsuario[]> {
  try {
    const { data } = await api.put<ApiEnvelope<{ funcoes?: FuncaoUsuario[] }>>(
      "/usuarios/me/funcoes",
      { funcoes },
    );
    if (!data.sucesso) throw new Error(data.message || "Não foi possível salvar as funções.");
    return data.dados?.funcoes ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao salvar funções de interesse.");
  }
}

/**
 * PUT /usuarios/me/habilidades — substituição total das habilidades do usuário
 * com nível por tecnologia. Retorna a lista salva em `dados.habilidades`.
 */
export async function salvarHabilidadesComNivel(
  habilidades: HabilidadeNivelInput[],
): Promise<HabilidadeComNivel[]> {
  try {
    const { data } = await api.put<ApiEnvelope<{ habilidades?: HabilidadeComNivel[] }>>(
      "/usuarios/me/habilidades",
      { habilidades },
    );
    if (!data.sucesso) throw new Error(data.message || "Não foi possível salvar as habilidades.");
    return data.dados?.habilidades ?? [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao salvar habilidades.");
  }
}
