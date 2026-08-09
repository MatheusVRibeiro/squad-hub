import axios from "axios";
import { api } from "./api";

/**
 * ETAPA 15 — Timeline de atividade do projeto.
 *
 * GET /projetos/:projetoId/eventos lista a atividade do squad (entrada/saída de
 * membros, tarefas criadas/assumidas/abandonadas/concluídas, commits e PRs do
 * GitHub, reavaliações). A rota exige ser membro ou dono do projeto.
 *
 * O backend (implementado em paralelo) tem histórico de devolver campos tanto em
 * snake_case quanto camelCase — o mapeamento abaixo tolera as duas variantes.
 * Em erro a service PROPAGA a falha (toFriendlyError) para a UI exibir o estado
 * de erro/retry — nunca mock silencioso. Durante SSR retorna vazio (não há token
 * no servidor; o cliente busca os dados reais).
 */

export type EventoProjeto = {
  id: string | number;
  /** Tipo do evento (ex.: "task_concluida", "pr_mergeado"). */
  tipo: string;
  /** Título legível do evento (ex.: "Tarefa concluída: API de autenticação"). */
  titulo: string;
  /** Nome do usuário que gerou o evento, quando houver. */
  usuarioNome?: string;
  /** Data ISO 8601 do evento (criado_em/criadoEm/createdAt). */
  criadoEm?: string;
  /** Metadados extras do evento (objeto) ou null. */
  metadados?: Record<string, unknown> | null;
  /** Tipo da entidade relacionada (task/membro/pr), quando houver. */
  entidadeTipo?: string;
  /** Id da entidade relacionada, quando houver. */
  entidadeId?: string | number;
};

/** Envelope real de GET /projetos/:projetoId/eventos (snake_case do backend). */
type EventosResponse = {
  sucesso: boolean;
  message?: string;
  nItens?: number;
  dados?: Array<Record<string, unknown>> | null;
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

/**
 * Normaliza metadados: aceita objeto, string JSON ou null/ausente.
 * String inválida → null (nunca quebra a timeline).
 */
function parseMetadados(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function mapEvento(c: Record<string, unknown>): EventoProjeto {
  return {
    id: (c.id ?? c.evento_id ?? 0) as string | number,
    tipo: str(c.tipo) ?? str(c.type) ?? "desconhecido",
    titulo: str(c.titulo) ?? str(c.title) ?? "Atividade no projeto",
    usuarioNome: str(c.usuario_nome) ?? str(c.usuarioNome) ?? str(c.usuario) ?? undefined,
    criadoEm: str(c.criado_em) ?? str(c.criadoEm) ?? str(c.createdAt) ?? undefined,
    metadados: parseMetadados(c.metadados ?? c.metadata),
    entidadeTipo: str(c.entidade_tipo) ?? str(c.entidadeTipo) ?? undefined,
    entidadeId: (c.entidade_id ?? c.entidadeId) as string | number | undefined,
  };
}

/**
 * GET /projetos/:projetoId/eventos — timeline de atividade do projeto.
 * Ordenação desc por criado_em é responsabilidade do backend.
 */
export async function fetchEventosProjeto(projetoId: string | number): Promise<EventoProjeto[]> {
  if (typeof window === "undefined") return [];

  try {
    const { data } = await api.get<EventosResponse>(`/projetos/${projetoId}/eventos`);
    if (data?.sucesso && Array.isArray(data.dados)) {
      return data.dados
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .map(mapEvento);
    }
    throw new Error("Resposta de eventos inválida do servidor.");
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível carregar a atividade do projeto.");
  }
}
