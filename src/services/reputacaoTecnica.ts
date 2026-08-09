import axios from "axios";
import { api } from "./api";

/**
 * ETAPA 12 — Reputação técnica (separada do XP).
 *
 * GET /usuarios/:id/reputacao-tecnica expõe a reputação calculada a partir de
 * EVIDÊNCIAS de entrega (tarefas verificadas, PRs mergeados, commits válidos e
 * projetos com entrega) — diferente do XP, que mede atividade/engajamento.
 * O id "me" resolve para o usuário autenticado (mesmo contrato dos demais
 * endpoints de /usuarios/:id).
 *
 * Segurança: NENHUM acesso a localStorage/window aqui (guard SSR) — o token é
 * injetado pelo interceptor de src/services/api.ts apenas no cliente. Em caso
 * de erro a service PROPAGA a falha (nunca cai em mock): a UI exibe o estado
 * de erro/retry, evitando dados fictícios no perfil.
 */

export type ReputacaoTecnica = {
  /** Pontuação técnica (DECIMAL(10,2)) calculada pelo backend. */
  score: number;
  /** Tarefas com entrega verificada (ex.: merge de PR vinculado). */
  tasksVerificadas: number;
  /** Pull requests mergeados. */
  prsMergeados: number;
  /** Commits válidos vinculados a tasks MontesSquad. */
  commitsValidos: number;
  /** Projetos com pelo menos uma entrega verificada. */
  projetosComEntrega: number;
};

/** Envelope real de GET /usuarios/:id/reputacao-tecnica. */
type ReputacaoTecnicaResponse = {
  sucesso: boolean;
  message?: string;
  dados?: Record<string, unknown> | null;
};

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;

/**
 * Mapeia a resposta do backend (implementado em paralelo — contrato em
 * definição): aceita camelCase (convenção dos demais endpoints) OU snake_case
 * (nome das colunas da tabela reputacao_tecnica_usuario). Valores ausentes ou
 * estranhos viram 0 — nunca NaN nem quebram a UI.
 */
function mapReputacaoTecnica(dados: Record<string, unknown>): ReputacaoTecnica {
  return {
    score: num(dados.score) ?? 0,
    tasksVerificadas: num(dados.tasksVerificadas) ?? num(dados.tasks_verificadas) ?? 0,
    prsMergeados: num(dados.prsMergeados) ?? num(dados.prs_mergeados) ?? 0,
    commitsValidos: num(dados.commitsValidos) ?? num(dados.commits_validos) ?? 0,
    projetosComEntrega: num(dados.projetosComEntrega) ?? num(dados.projetos_com_entrega) ?? 0,
  };
}

/**
 * GET /usuarios/:id/reputacao-tecnica — reputação técnica do usuário.
 * Sem userId, usa "me" (usuário autenticado).
 */
export async function getReputacaoTecnica(userId?: string): Promise<ReputacaoTecnica> {
  try {
    const { data } = await api.get<ReputacaoTecnicaResponse>(
      `/usuarios/${userId ?? "me"}/reputacao-tecnica`,
    );
    if (data?.sucesso && data.dados && typeof data.dados === "object") {
      return mapReputacaoTecnica(data.dados);
    }
    throw new Error("Resposta de reputação técnica inválida do servidor.");
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível carregar a reputação técnica.");
  }
}
