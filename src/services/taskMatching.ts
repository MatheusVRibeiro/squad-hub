import axios from "axios";
import { api } from "./api";

/**
 * ETAPA 17 — Matching Desenvolvedor ↔ Task.
 *
 * GET /projetos/:projetoId/tasks/recomendadas recomenda tasks do projeto
 * compatíveis com o perfil técnico do desenvolvedor autenticado (rota
 * verificarToken + somenteMembroOuDonoDoProjeto). O backend é implementado
 * em paralelo, então o mapeamento tolera variações de contrato: `taskId`/`id`,
 * `titulo`/`title`, `compatibilidade`/`score` e `motivos` como array de
 * strings.
 *
 * IMPORTANTE: matching é RECOMENDAÇÃO, não autorização — a UI nunca bloqueia
 * assumir uma task por score baixo; o backend decide quem pode assumir.
 *
 * Em erro a service PROPAGA a falha (toFriendlyError) para a UI exibir o
 * estado de erro/retry — nunca mock silencioso. Durante SSR retorna vazio
 * (não há token no servidor; o cliente busca os dados reais).
 */

export type TaskRecomendada = {
  /** Id da task recomendada (taskId/id). */
  taskId: string | number;
  /** Título da task (titulo/title). */
  titulo: string;
  /** Score de compatibilidade 0-100 (compatibilidade/score). */
  compatibilidade: number;
  /** Explicações legíveis da recomendação. */
  motivos: string[];
};

/** Envelope real de GET /projetos/:projetoId/tasks/recomendadas. */
type TasksRecomendadasResponse = {
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

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function mapMotivos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function mapTaskRecomendada(item: Record<string, unknown>): TaskRecomendada | null {
  const taskId = item.taskId ?? item.id;
  if (taskId == null) return null;

  return {
    taskId: taskId as string | number,
    titulo: str(item.titulo) ?? str(item.title) ?? "Task sem título",
    compatibilidade: num(item.compatibilidade) ?? num(item.score) ?? 0,
    motivos: mapMotivos(item.motivos ?? item.motivo ?? item.reasons),
  };
}

/**
 * GET /projetos/:projetoId/tasks/recomendadas — tasks recomendadas para o
 * desenvolvedor autenticado dentro de um projeto (exige ser membro/dono).
 * Durante SSR retorna [] (não há token no servidor).
 */
export async function fetchTasksRecomendadas(
  projetoId: string | number,
): Promise<TaskRecomendada[]> {
  if (typeof window === "undefined") return [];

  try {
    const { data } = await api.get<TasksRecomendadasResponse>(
      `/projetos/${projetoId}/tasks/recomendadas`,
    );
    if (data?.sucesso && Array.isArray(data.dados)) {
      return data.dados
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .map(mapTaskRecomendada)
        .filter((r): r is TaskRecomendada => r !== null);
    }
    throw new Error("Resposta de tasks recomendadas inválida do servidor.");
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível carregar as tasks recomendadas.");
  }
}
