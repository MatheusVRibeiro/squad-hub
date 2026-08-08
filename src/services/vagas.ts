import axios from "axios";
import { api } from "./api";

export type NivelDesejado = "iniciante" | "intermediario" | "avancado" | "qualquer";
export type VagaStatus = "aberta" | "fechada";

export type Funcao = {
  id: number;
  nome: string;
};

/** Vaga do projeto no formato da UI (snake_case, como o GET /projetos/:id/vagas). */
export type Vaga = {
  id: string;
  projeto_id: string | number;
  funcao_id: number;
  funcao_nome: string;
  quantidade: number;
  preenchidas: number;
  descricao: string | null;
  nivel_desejado: NivelDesejado;
  status: VagaStatus;
};

/** Payload de criação/edição (snake_case, contrato do backend). */
export type VagaPayload = {
  funcao_id: number;
  quantidade: number;
  descricao?: string | null;
  nivel_desejado?: NivelDesejado;
  status?: VagaStatus;
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
 * Normaliza uma vaga vinda do backend para o tipo `Vaga` da UI.
 * Aceita snake_case (GET /projetos/:id/vagas) e camelCase
 * (GET /projetos/:id → `projeto.vagas`, usado no detalhe do projeto).
 */
export function normalizarVaga(raw: Record<string, unknown>): Vaga {
  const nivel = String(raw.nivel_desejado ?? raw.nivelDesejado ?? "qualquer") as NivelDesejado;
  const status = String(raw.status ?? "aberta") as VagaStatus;
  return {
    id: String(raw.id),
    projeto_id: (raw.projeto_id ?? raw.projetoId ?? "") as string | number,
    funcao_id: Number(raw.funcao_id ?? raw.funcaoId ?? 0),
    funcao_nome: String(raw.funcao_nome ?? raw.funcaoNome ?? "Função"),
    quantidade: Number(raw.quantidade ?? 1),
    preenchidas: Number(raw.preenchidas ?? 0),
    descricao: (raw.descricao as string | null) ?? null,
    nivel_desejado: nivel,
    status,
  };
}

/** GET /projetos/:projetoId/vagas — lista as vagas do projeto (qualquer logado). */
export async function getVagasProjeto(projectId: string): Promise<Vaga[]> {
  try {
    const { data } = await api.get<ApiEnvelope<Record<string, unknown>[]>>(
      `/projetos/${projectId}/vagas`,
    );
    if (data.sucesso && Array.isArray(data.dados)) {
      return data.dados.map((raw) => normalizarVaga(raw));
    }
    return [];
  } catch (err) {
    throw toFriendlyError(err, "Erro ao carregar as vagas do projeto.");
  }
}

/** POST /projetos/:projetoId/vagas — dono cria uma vaga (somenteDonoDoProjeto). */
export async function criarVaga(projectId: string, payload: VagaPayload): Promise<Vaga> {
  try {
    const { data } = await api.post<ApiEnvelope<Record<string, unknown>>>(
      `/projetos/${projectId}/vagas`,
      {
        funcao_id: payload.funcao_id,
        quantidade: payload.quantidade,
        descricao: payload.descricao ?? null,
        nivel_desejado: payload.nivel_desejado ?? "qualquer",
        status: payload.status ?? "aberta",
      },
    );
    if (!data.sucesso || !data.dados) {
      throw new Error(data.message || "Não foi possível criar a vaga.");
    }
    return normalizarVaga(data.dados);
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível criar a vaga.");
  }
}

/** PATCH /projetos/:projetoId/vagas/:vagaId — dono edita uma vaga. */
export async function atualizarVaga(
  projectId: string,
  vagaId: string,
  payload: Partial<VagaPayload>,
): Promise<Vaga> {
  try {
    const { data } = await api.patch<ApiEnvelope<Record<string, unknown>>>(
      `/projetos/${projectId}/vagas/${vagaId}`,
      {
        funcao_id: payload.funcao_id,
        quantidade: payload.quantidade,
        descricao: payload.descricao,
        nivel_desejado: payload.nivel_desejado,
        status: payload.status,
      },
    );
    if (!data.sucesso || !data.dados) {
      throw new Error(data.message || "Não foi possível atualizar a vaga.");
    }
    return normalizarVaga(data.dados);
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível atualizar a vaga.");
  }
}

/**
 * DELETE /projetos/:projetoId/vagas/:vagaId — dono exclui uma vaga.
 * Em caso de 409 (vaga com membros vinculados), o erro amigável carrega a
 * mensagem do backend ("Vaga possui membros vinculados") para o toast.
 */
export async function excluirVaga(projectId: string, vagaId: string): Promise<void> {
  try {
    const { data } = await api.delete<ApiEnvelope<null>>(`/projetos/${projectId}/vagas/${vagaId}`);
    if (!data.sucesso) {
      throw new Error(data.message || "Não foi possível excluir a vaga.");
    }
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível excluir a vaga.");
  }
}
