import axios from "axios";
import { api } from "./api";

/**
 * ETAPA 11 — Portfólio verificável.
 *
 * GET /usuarios/:id/portfolio transforma entregas GitHub em evidência
 * profissional visível no perfil: por projeto, mostra tarefas verificadas,
 * commits, PRs mergeados e tecnologias. O id "me" resolve para o usuário
 * autenticado (mesmo contrato de GET /usuarios/me/reputacao).
 *
 * Segurança: NENHUM acesso a localStorage/window aqui (guard SSR) — o token é
 * injetado pelo interceptor de src/services/api.ts apenas no cliente. Em caso
 * de erro a service PROPAGA a falha (nunca cai em mock): a UI exibe o estado
 * de erro/retry, evitando dados fictícios no perfil.
 */

export type PortfolioContribuicao = {
  /** Título da entrega (ex.: "API de autenticação"). */
  titulo?: string;
  /** Descrição opcional da contribuição. */
  descricao?: string;
  /** Número do pull request mergeado (ex.: 15 → "PR #15"). */
  prNumero?: number;
  /** Quantidade de commits da contribuição. */
  commits?: number;
  /** Data (ISO 8601) opcional da entrega. */
  data?: string;
};

export type PortfolioProjeto = {
  projetoId: number;
  projetoNome: string;
  /** Função exercida no squad (ex.: "Backend"). */
  funcao?: string;
  tasksVerificadas: number;
  commits: number;
  prsMergeados: number;
  tecnologias: string[];
  contribuicoes: PortfolioContribuicao[];
  /**
   * ETAPA 14 (futura): projeto privado. Enquanto não existe regra explícita de
   * visibilidade, detalhes técnicos NÃO são exibidos — apenas o aviso genérico
   * "Contribuição verificada em projeto privado".
   */
  privado?: boolean;
};

export type Portfolio = {
  projetos: PortfolioProjeto[];
};

/** Envelope real de GET /usuarios/:id/portfolio (snake_case do backend). */
type PortfolioResponse = {
  sucesso: boolean;
  message?: string;
  dados?: {
    projetos?: Array<Record<string, unknown>>;
  } | null;
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

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;

/**
 * Mapeia uma contribuição individual. O backend está sendo implementado em
 * paralelo (ETAPA 11) — o mapeamento tolera os nomes prováveis de campo
 * (titulo/nome/descricao, prNumero/pr_numero/numero_pr) para não quebrar a UI
 * se o contrato final variar.
 */
function mapContribuicao(c: Record<string, unknown>): PortfolioContribuicao {
  return {
    titulo: str(c.titulo) ?? str(c.nome) ?? str(c.descricao),
    descricao: str(c.descricao),
    prNumero: num(c.prNumero) ?? num(c.pr_numero) ?? num(c.numero_pr),
    commits: num(c.commits),
    data: str(c.data) ?? str(c.created_at) ?? str(c.merged_at),
  };
}

function mapProjeto(p: Record<string, unknown>): PortfolioProjeto {
  const tecnologias = Array.isArray(p.tecnologias) ? p.tecnologias.map(String).filter(Boolean) : [];
  const contribuicoes = Array.isArray(p.contribuicoes)
    ? p.contribuicoes
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .map(mapContribuicao)
    : [];
  // ETAPA 14: o projeto é tratado como privado quando o backend sinaliza via
  // flag explícita `privado`, via visibilidade ENUM, OU quando o dono bloqueou
  // a exibição no portfólio público (permitir_portfolio_publico=false) — aceita
  // a variante snake_case da coluna e a camelCase do GET /usuarios/:id/portfolio.
  const ehPrivado =
    p.privado === true ||
    str(p.visibilidade) === "privado" ||
    p.permitir_portfolio_publico === false ||
    p.permitirPortfolioPublico === false;

  return {
    projetoId: num(p.projetoId) ?? 0,
    projetoNome: str(p.projetoNome) ?? "Projeto",
    funcao: str(p.funcao),
    tasksVerificadas: num(p.tasksVerificadas) ?? 0,
    commits: num(p.commits) ?? 0,
    prsMergeados: num(p.prsMergeados) ?? 0,
    tecnologias,
    contribuicoes,
    privado: ehPrivado,
  };
}

/**
 * GET /usuarios/:id/portfolio — portfólio verificável do usuário.
 * Sem userId, usa "me" (usuário autenticado).
 */
export async function getPortfolio(userId?: string): Promise<Portfolio> {
  try {
    const { data } = await api.get<PortfolioResponse>(`/usuarios/${userId ?? "me"}/portfolio`);
    if (data?.sucesso && data.dados && Array.isArray(data.dados.projetos)) {
      return { projetos: data.dados.projetos.map(mapProjeto) };
    }
    throw new Error("Resposta de portfólio inválida do servidor.");
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível carregar o portfólio.");
  }
}
