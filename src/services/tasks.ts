import axios from "axios";
import { api } from "./api";
import type { TaskDificuldade } from "./projectDetail";

export type KanbanStatus = "todo" | "doing" | "review" | "done";

export type KanbanTask = {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  subtasks?: { id: string; title: string; done: boolean }[];
  // ETAPA 7: dificuldade (ENUM) e habilidades esperadas (nomes + ids).
  dificuldade?: TaskDificuldade;
  habilidades?: string[];
  habilidadeIds?: number[];
};

/** Formato cru retornado pelo backend em GET /projetos/:id/tarefas (snake_case). */
type BackendTask = {
  id: number;
  projeto_id: number;
  responsavel_id: number | null;
  titulo: string;
  descricao: string | null;
  status: KanbanStatus;
  prioridade: "low" | "medium" | "high";
  data_vencimento: string | null;
  responsavel_nome?: string | null;
  subtasks?: { id: number; titulo: string; done: boolean }[];
  dificuldade?: TaskDificuldade;
  habilidades?: { id: number; nome: string }[] | string[];
  /** ETAPA 10: soft-delete de tarefas — não-nulo = arquivada (fora do Kanban). */
  excluida_em?: string | null;
};

/** ETAPA 7: normaliza `habilidades` do backend para nomes (aceita objetos
 *  `{id, nome}` ou strings puras) — retrocompatível com a resposta antiga. */
function extrairNomesHabilidades(
  habilidades?: { id: number; nome: string }[] | string[],
): string[] {
  if (!Array.isArray(habilidades)) return [];
  return habilidades
    .map((h) => (typeof h === "string" ? h : h && typeof h.nome === "string" ? h.nome : ""))
    .filter(Boolean);
}

function extrairIdsHabilidades(habilidades?: { id: number; nome: string }[] | string[]): number[] {
  if (!Array.isArray(habilidades)) return [];
  return habilidades
    .map((h) => (typeof h === "string" ? Number.NaN : Number(h?.id)))
    .filter((id) => Number.isFinite(id));
}

/**
 * Busca as tarefas reais do Kanban de um projeto (GET /projetos/:id/tarefas).
 * A rota exige ser membro ou dono do squad — em PROD falhas propagam o erro
 * (sem fallback/mock silencioso).
 */
export async function fetchProjectTasks(projectId: string): Promise<KanbanTask[]> {
  const { data } = await api.get<{ sucesso: boolean; dados: BackendTask[] }>(
    `/projetos/${projectId}/tarefas`,
  );

  if (data?.sucesso && Array.isArray(data.dados)) {
    // ETAPA 10: defesa em profundidade — o backend já filtra tarefas arquivadas
    // (excluida_em), mas o frontend nunca deve exibir uma task soft-deletada no
    // Kanban, mesmo que a API as retorne por engano.
    return data.dados
      .filter((t) => !t.excluida_em)
      .map((t) => ({
        id: String(t.id),
        title: t.titulo,
        description: t.descricao || undefined,
        status: t.status,
        assignee: t.responsavel_nome || undefined,
        priority: t.prioridade,
        dueDate: t.data_vencimento || undefined,
        subtasks: (t.subtasks ?? []).map((s) => ({
          id: String(s.id),
          title: s.titulo,
          done: Boolean(s.done),
        })),
        dificuldade: t.dificuldade,
        habilidades: extrairNomesHabilidades(t.habilidades),
        habilidadeIds: extrairIdsHabilidades(t.habilidades),
      }));
  }

  throw new Error("Resposta inesperada do servidor ao listar tarefas.");
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 9 — abandonar / remover responsável / reatribuir task + histórico
// ─────────────────────────────────────────────────────────────────────────────

/** Ações registradas no histórico de responsáveis (ENUM do backend). */
export type HistoricoAcao = "assumiu" | "abandonou" | "removido" | "reatribuido" | "concluiu";

/** Registro normalizado do GET /historico-responsaveis (camelCase p/ a UI). */
export type HistoricoResponsavel = {
  id: string;
  tarefaId: string;
  usuarioId: number;
  /** Nome do usuário envolvido na ação (JOIN usuarios). */
  usuarioNome?: string;
  acao: HistoricoAcao;
  /** Quem executou (owner em removido/reatribuido; o próprio em assumiu/abandonou). */
  realizadoPor: number | null;
  realizadoPorNome?: string | null;
  criadoEm?: string;
};

/** Formato cru do GET /historico-responsaveis (snake_case do backend). */
type BackendHistorico = {
  id: number;
  tarefa_id: number;
  usuario_id: number;
  acao: HistoricoAcao | string;
  realizado_por: number | null;
  criado_em?: string | null;
  usuario_nome?: string | null;
  realizado_por_nome?: string | null;
};

/** Resultado das mutações de responsável (abandonar/remover/reatribuir). */
export type TaskResponsavelResult = {
  id?: string;
  status?: KanbanStatus;
  responsavelId?: number | null;
};

/** Contrato do backend para as mutações de responsável (snake_case). */
type BackendTaskResponsavel = {
  id?: number | string;
  status?: KanbanStatus | string;
  responsavel_id?: number | null;
};

/** Envelope padrão das respostas da API (sucesso/message/dados). */
type ApiEnvelope<T> = {
  sucesso: boolean;
  message?: string;
  dados?: T;
};

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/**
 * POST /projetos/:projetoId/tarefas/:tarefaId/abandonar — apenas o responsável
 * atual abandona a task (ETAPA 9). O backend zera responsavel_id, volta o
 * status para 'todo' e registra o histórico (acao='abandonou').
 */
export async function abandonarTarefa(
  projectId: string | number,
  taskId: string | number,
): Promise<TaskResponsavelResult> {
  try {
    const { data } = await api.post<ApiEnvelope<BackendTaskResponsavel | null>>(
      `/projetos/${projectId}/tarefas/${taskId}/abandonar`,
    );
    if (!data.sucesso) {
      throw new Error(data.message || "Não foi possível abandonar a tarefa.");
    }
    return normalizarTaskResponsavel(data.dados);
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível abandonar a tarefa.");
  }
}

/**
 * POST /projetos/:projetoId/tarefas/:tarefaId/remover-responsavel — somente o
 * owner remove o responsável (ETAPA 9). O histórico registra acao='removido'
 * com realizado_por = owner.
 */
export async function removerResponsavel(
  projectId: string | number,
  taskId: string | number,
): Promise<TaskResponsavelResult> {
  try {
    const { data } = await api.post<ApiEnvelope<BackendTaskResponsavel | null>>(
      `/projetos/${projectId}/tarefas/${taskId}/remover-responsavel`,
    );
    if (!data.sucesso) {
      throw new Error(data.message || "Não foi possível remover o responsável.");
    }
    return normalizarTaskResponsavel(data.dados);
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível remover o responsável.");
  }
}

/**
 * POST /projetos/:projetoId/tarefas/:tarefaId/reatribuir — somente o owner
 * reatribui a task a outro membro ATIVO do projeto (ETAPA 9). O histórico
 * registra acao='reatribuido' com realizado_por = owner.
 */
export async function reatribuirTarefa(
  projectId: string | number,
  taskId: string | number,
  usuarioId: number,
): Promise<TaskResponsavelResult> {
  try {
    const { data } = await api.post<ApiEnvelope<BackendTaskResponsavel | null>>(
      `/projetos/${projectId}/tarefas/${taskId}/reatribuir`,
      { usuario_id: usuarioId },
    );
    if (!data.sucesso) {
      throw new Error(data.message || "Não foi possível reatribuir a tarefa.");
    }
    return normalizarTaskResponsavel(data.dados);
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível reatribuir a tarefa.");
  }
}

/**
 * GET /projetos/:projetoId/tarefas/:tarefaId/historico-responsaveis —
 * membro/dono consulta o histórico de responsáveis da task (ETAPA 9).
 * Normaliza as linhas snake_case (usuario_nome/realizado_por_nome) para o
 * contrato camelCase da UI, mantendo apenas ações conhecidas do ENUM.
 */
export async function getHistoricoResponsaveis(
  projectId: string | number,
  taskId: string | number,
): Promise<HistoricoResponsavel[]> {
  try {
    const { data } = await api.get<ApiEnvelope<BackendHistorico[]>>(
      `/projetos/${projectId}/tarefas/${taskId}/historico-responsaveis`,
    );
    if (!data.sucesso || !Array.isArray(data.dados)) {
      throw new Error(
        data.message || "Resposta inesperada do servidor ao carregar o histórico de responsáveis.",
      );
    }
    const acoes: HistoricoAcao[] = ["assumiu", "abandonou", "removido", "reatribuido", "concluiu"];
    return data.dados.map((h) => ({
      id: String(h.id),
      tarefaId: String(h.tarefa_id),
      usuarioId: Number(h.usuario_id),
      usuarioNome: h.usuario_nome || undefined,
      acao: acoes.includes(h.acao as HistoricoAcao) ? (h.acao as HistoricoAcao) : "assumiu",
      realizadoPor: h.realizado_por != null ? Number(h.realizado_por) : null,
      realizadoPorNome: h.realizado_por_nome || null,
      criadoEm: h.criado_em || undefined,
    }));
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível carregar o histórico de responsáveis.");
  }
}

/** Normaliza o retorno das mutações de responsável (snake → camel). */
function normalizarTaskResponsavel(dados?: BackendTaskResponsavel | null): TaskResponsavelResult {
  if (!dados) return {};
  const status = dados.status;
  const statusValido: KanbanStatus[] = ["todo", "doing", "review", "done"];
  return {
    id: dados.id != null ? String(dados.id) : undefined,
    status: statusValido.includes(status as KanbanStatus) ? (status as KanbanStatus) : undefined,
    responsavelId: dados.responsavel_id != null ? Number(dados.responsavel_id) : null,
  };
}
