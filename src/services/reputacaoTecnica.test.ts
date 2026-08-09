import { describe, expect, it, vi } from "vitest";

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

import { getReputacaoTecnica } from "./reputacaoTecnica";

// Payload típico de GET /usuarios/:id/reputacao-tecnica (ETAPA 12) — a tabela
// reputacao_tecnica_usuario usa snake_case; os demais endpoints respondem
// camelCase, então o service aceita os dois.
const validDados = {
  score: 87.5,
  tasksVerificadas: 12,
  prsMergeados: 5,
  commitsValidos: 48,
  projetosComEntrega: 3,
};

describe("getReputacaoTecnica (ETAPA 12 — reputação técnica separada do XP)", () => {
  it("desempacota {sucesso, dados} e mapeia para o contrato do frontend", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, message: "ok", dados: validDados },
    });

    const rep = await getReputacaoTecnica();

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/me/reputacao-tecnica");
    expect(rep).toEqual(validDados);
  });

  it("usa o userId informado na URL", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, dados: validDados },
    });

    await getReputacaoTecnica("99");

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/99/reputacao-tecnica");
  });

  it("aceita snake_case (colunas da tabela) quando o backend não mapeia para camelCase", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          score: 60,
          tasks_verificadas: 3,
          prs_mergeados: 1,
          commits_validos: 20,
          projetos_com_entrega: 2,
        },
      },
    });

    const rep = await getReputacaoTecnica("7");

    expect(rep).toEqual({
      score: 60,
      tasksVerificadas: 3,
      prsMergeados: 1,
      commitsValidos: 20,
      projetosComEntrega: 2,
    });
  });

  it("reputação zerada (sem evidências ainda) resolve sem erro com zeros", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          score: 0,
          tasks_verificadas: 0,
          prs_mergeados: 0,
          commits_validos: 0,
          projetos_com_entrega: 0,
        },
      },
    });

    const rep = await getReputacaoTecnica();

    expect(rep).toEqual({
      score: 0,
      tasksVerificadas: 0,
      prsMergeados: 0,
      commitsValidos: 0,
      projetosComEntrega: 0,
    });
  });

  it("normaliza valores ausentes/estranhos (null, string, negativo viram 0)", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          score: null,
          tasksVerificadas: "12",
          prsMergeados: undefined,
          commitsValidos: 10,
          projetosComEntrega: -1,
        },
      },
    });

    const rep = await getReputacaoTecnica();

    expect(rep).toEqual({
      score: 0,
      tasksVerificadas: 0,
      prsMergeados: 0,
      commitsValidos: 10,
      projetosComEntrega: 0,
    });
  });

  it("erro do backend (axios) rejeita com a mensagem amigável do servidor", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        data: { message: "Usuário não encontrado" },
      },
    });

    await expect(getReputacaoTecnica("999")).rejects.toThrow("Usuário não encontrado");
  });

  it("erro sem mensagem rejeita com o fallback amigável", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    await expect(getReputacaoTecnica()).rejects.toThrow(
      "Não foi possível carregar a reputação técnica.",
    );
  });

  it("resposta inválida (sucesso false) lança erro explícito", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, dados: null } });

    await expect(getReputacaoTecnica()).rejects.toThrow(
      "Resposta de reputação técnica inválida do servidor.",
    );
  });
});
