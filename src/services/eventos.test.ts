import { afterEach, describe, expect, it, vi } from "vitest";

// Mock do módulo ./api — o service nunca toca axios real nos testes.
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import { fetchEventosProjeto } from "./eventos";

describe("fetchEventosProjeto (ETAPA 15 — timeline de atividade do projeto)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia resposta snake_case do backend para o contrato do frontend", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "ok",
        nItens: 2,
        dados: [
          {
            id: 1,
            projeto_id: 7,
            usuario_id: 3,
            tipo: "task_concluida",
            entidade_tipo: "task",
            entidade_id: 12,
            titulo: "Tarefa concluída: API de autenticação",
            metadados: { taskId: 12, dificuldade: "media" },
            criado_em: "2026-08-09T12:00:00.000Z",
            usuario_nome: "Maria Souza",
          },
          {
            id: 2,
            projeto_id: 7,
            usuario_id: 4,
            tipo: "membro_entrou",
            entidade_tipo: "membro",
            entidade_id: 4,
            titulo: "João entrou no squad",
            metadados: null,
            criado_em: "2026-08-08T10:00:00.000Z",
            usuario_nome: "João Pedro",
          },
        ],
      },
    });

    const eventos = await fetchEventosProjeto(7);

    expect(mocks.get).toHaveBeenCalledWith("/projetos/7/eventos");
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatchObject({
      id: 1,
      tipo: "task_concluida",
      titulo: "Tarefa concluída: API de autenticação",
      usuarioNome: "Maria Souza",
      criadoEm: "2026-08-09T12:00:00.000Z",
      metadados: { taskId: 12, dificuldade: "media" },
      entidadeTipo: "task",
      entidadeId: 12,
    });
    expect(eventos[1]).toMatchObject({
      id: 2,
      tipo: "membro_entrou",
      usuarioNome: "João Pedro",
      metadados: null,
    });
  });

  it("mapeia resposta camelCase (backend histórico) para o mesmo contrato", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 9,
            tipo: "pr_mergeado",
            titulo: "PR #15 mergeado",
            usuarioNome: "Ana Lima",
            criadoEm: "2026-08-09T18:30:00.000Z",
            metadados: { prNumero: 15 },
            entidadeTipo: "pr",
            entidadeId: 15,
          },
        ],
      },
    });

    const eventos = await fetchEventosProjeto("7");

    expect(mocks.get).toHaveBeenCalledWith("/projetos/7/eventos");
    expect(eventos[0]).toMatchObject({
      id: 9,
      tipo: "pr_mergeado",
      titulo: "PR #15 mergeado",
      usuarioNome: "Ana Lima",
      criadoEm: "2026-08-09T18:30:00.000Z",
      metadados: { prNumero: 15 },
      entidadeTipo: "pr",
      entidadeId: 15,
    });
  });

  it("timeline vazia (dados: []) resolve como [] sem erro", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, nItens: 0, dados: [] },
    });

    const eventos = await fetchEventosProjeto(7);

    expect(eventos).toEqual([]);
  });

  it("normaliza campos ausentes, metadados como string JSON e filtra itens nulos", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 3,
            tipo: "commit_detectado",
            titulo: "Commit em main",
            criadoEm: "2026-08-09T14:00:00.000Z",
            metadados: '{"hash":"abc123"}',
          },
          { id: 4, type: "reavaliacao", title: "Reavaliação de XP" },
          null, // item inválido → ignorado
        ],
      },
    });

    const eventos = await fetchEventosProjeto(7);

    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatchObject({
      id: 3,
      tipo: "commit_detectado",
      metadados: { hash: "abc123" }, // string JSON parseada
      usuarioNome: undefined,
      entidadeTipo: undefined,
    });
    expect(eventos[1]).toMatchObject({
      id: 4,
      tipo: "reavaliacao", // alias type → tipo
      titulo: "Reavaliação de XP", // alias title → titulo
    });
  });

  it("erro do backend (axios) propaga a mensagem amigável do servidor", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: "Você não é membro deste projeto" } },
    });

    await expect(fetchEventosProjeto(7)).rejects.toThrow("Você não é membro deste projeto");
  });

  it("resposta inválida (sucesso false) lança erro explícito", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, dados: null } });

    await expect(fetchEventosProjeto(7)).rejects.toThrow(
      "Resposta de eventos inválida do servidor.",
    );
  });
});
