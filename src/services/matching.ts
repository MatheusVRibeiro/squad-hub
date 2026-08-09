import axios from "axios";
import { api } from "./api";

/**
 * ETAPA 16 — Matching Desenvolvedor ↔ Projeto.
 *
 * GET /matching/projetos recomenda projetos compatíveis com o perfil técnico
 * do desenvolvedor autenticado (rota protegida por token). O backend é
 * implementado em paralelo, então o mapeamento abaixo tolera variações de
 * contrato: `dados.recomendacoes` ou `dados` como array direto; item com
 * `projeto` aninhado ou achatado; campos snake_case e camelCase.
 *
 * Em erro a service PROPAGA a falha (toFriendlyError) para a UI exibir o
 * estado de erro/retry — nunca mock silencioso. Durante SSR retorna vazio
 * (não há token no servidor; o cliente busca os dados reais).
 */

export type FatorMatching = {
  /** Percentual de compatibilidade do fator (0-100). */
  percentual?: number;
  /** Rótulo legível do fator, quando o backend enviar. */
  label?: string;
};

export type RecomendacaoProjeto = {
  /** Id do projeto recomendado (id/projetoId/projeto_id). */
  projetoId: string | number;
  /** Título do projeto (titulo/nome). */
  titulo: string;
  descricao?: string;
  tecnologias?: string[];
  /** Score de compatibilidade (0-100). */
  score: number;
  /** Detalhamento por fator (habilidades, funcao, nivel, ...). */
  fatores?: Record<string, FatorMatching>;
  /** Explicações legíveis da recomendação. */
  explicacao?: string[];
};

/** Envelope real de GET /matching/projetos. */
type MatchingResponse = {
  sucesso: boolean;
  message?: string;
  nItens?: number;
  dados?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function mapTecnologias(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => (typeof t === "string" ? t.trim() : String(t))).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split("||")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function mapExplicacao(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function mapFatores(raw: unknown): Record<string, FatorMatching> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const fatores: Record<string, FatorMatching> = {};
  for (const [chave, valor] of Object.entries(raw as Record<string, unknown>)) {
    if (!valor || typeof valor !== "object") continue;
    const f = valor as Record<string, unknown>;
    fatores[chave] = {
      percentual: num(f.percentual) ?? num(f.percentual_comp) ?? num(f.valor),
      label: str(f.label) ?? str(f.nome) ?? undefined,
    };
  }
  return fatores;
}

function mapRecomendacao(item: Record<string, unknown>): RecomendacaoProjeto | null {
  // Item pode vir com `projeto` aninhado ou achatado (campos no próprio item).
  const projeto =
    item.projeto && typeof item.projeto === "object" && !Array.isArray(item.projeto)
      ? (item.projeto as Record<string, unknown>)
      : item;

  const projetoId = projeto.id ?? projeto.projetoId ?? projeto.projeto_id;
  if (projetoId == null) return null;

  return {
    projetoId: projetoId as string | number,
    titulo:
      str(projeto.titulo) ??
      str(projeto.nome) ??
      str(projeto.projetoNome) ??
      str(projeto.name) ??
      "Projeto sem título",
    descricao: str(projeto.descricao) ?? str(projeto.descricao_curta) ?? undefined,
    tecnologias: mapTecnologias(projeto.tecnologias ?? projeto.tecnologia),
    score: num(item.score) ?? num(item.score_compatibilidade) ?? 0,
    fatores: mapFatores(item.fatores ?? item.fatoresCompatibilidade),
    explicacao: mapExplicacao(item.explicacao ?? item.explicacoes),
  };
}

/** Extrai a lista de recomendações do envelope, tolerando os formatos prováveis. */
function extrairRecomendacoes(data: MatchingResponse): unknown[] | null {
  if (Array.isArray(data?.dados)) return data.dados;
  if (data?.dados && typeof data.dados === "object") {
    const recs = (data.dados as Record<string, unknown>).recomendacoes;
    if (Array.isArray(recs)) return recs;
  }
  return null;
}

/**
 * GET /matching/projetos — recomendações de projetos para o desenvolvedor
 * autenticado. Durante SSR retorna [] (não há token no servidor).
 */
export async function fetchRecomendacoes(): Promise<RecomendacaoProjeto[]> {
  if (typeof window === "undefined") return [];

  try {
    const { data } = await api.get<MatchingResponse>("/matching/projetos");
    const lista = extrairRecomendacoes(data);
    if (data?.sucesso && lista) {
      return lista
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .map(mapRecomendacao)
        .filter((r): r is RecomendacaoProjeto => r !== null);
    }
    throw new Error("Resposta de recomendações inválida do servidor.");
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível carregar suas recomendações.");
  }
}
