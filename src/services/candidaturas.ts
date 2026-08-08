import axios from "axios";
import { api } from "./api";

/**
 * Payload de candidatura (contrato do backend, snake_case).
 * `vaga_id` é opcional — quando ausente a candidatura segue "livre"
 * (sem vínculo com uma vaga do projeto).
 */
export type CandidaturaPayload = {
  vaga_id?: number | null;
  mensagem: string;
};

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
 * POST /projetos/:projetoId/candidaturas — candidatura direcionada por vaga
 * (Evolução ETAPA 5). O backend valida a pertinência/abertura da vaga e, ao
 * aceitar a candidatura, incrementa `preenchidas` da vaga.
 *
 * Quando `vaga_id` é null/undefined, a chave é omitida do corpo da requisição
 * (candidatura livre, comportamento da ETAPA 4).
 */
export async function candidatarComVaga(
  projetoId: string,
  payload: CandidaturaPayload,
): Promise<void> {
  try {
    const body: Record<string, unknown> = { mensagem: payload.mensagem };
    if (payload.vaga_id != null) {
      body.vaga_id = payload.vaga_id;
    }
    const { data } = await api.post<ApiEnvelope<unknown>>(
      `/projetos/${projetoId}/candidaturas`,
      body,
    );
    if (!data.sucesso) {
      throw new Error(data.message || "Não foi possível enviar a candidatura.");
    }
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível enviar a candidatura.");
  }
}
