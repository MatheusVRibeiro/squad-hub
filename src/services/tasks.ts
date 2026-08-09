import { api } from "./api";
import type { TaskDificuldade } from "./projectDetail";

export type KanbanStatus = "todo" | "doing" | "done";

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
    return data.dados.map((t) => ({
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
