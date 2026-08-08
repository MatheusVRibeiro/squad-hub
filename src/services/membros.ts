import axios from "axios";
import { api } from "./api";

type ApiEnvelope<T = unknown> = {
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
 * POST /projetos/:projetoId/sair — membro sai do squad (ETAPA 6).
 * O backend aplica soft-delete: membros_equipe.status vira 'saiu' (histórico
 * preservado, sem DELETE físico). O dono do projeto NÃO pode sair (400).
 */
export async function sairDoProjeto(projectId: string): Promise<void> {
  try {
    const { data } = await api.post<ApiEnvelope<null>>(`/projetos/${projectId}/sair`);
    if (!data.sucesso) {
      throw new Error(data.message || "Não foi possível sair do projeto.");
    }
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível sair do projeto.");
  }
}
