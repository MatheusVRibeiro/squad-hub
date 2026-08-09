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

import { getPortfolio } from "./portfolio";

// Payload típico de GET /usuarios/:id/portfolio (snake_case do backend, ETAPA 11).
const validDados = {
  projetos: [
    {
      projetoId: 5,
      projetoNome: "Sistema Financeiro",
      funcao: "Backend",
      tasksVerificadas: 4,
      commits: 32,
      prsMergeados: 4,
      tecnologias: ["Node.js", "MySQL"],
      contribuicoes: [
        { titulo: "API de autenticação", prNumero: 15, commits: 8 },
        { titulo: "Recuperação de senha", prNumero: 27, commits: 5 },
      ],
    },
  ],
};

describe("getPortfolio (ETAPA 11 — portfólio verificável)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("desempacota {sucesso, dados} e mapeia projetos para o contrato do frontend", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, message: "ok", dados: validDados },
    });

    const portfolio = await getPortfolio();

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/me/portfolio");
    expect(portfolio.projetos).toHaveLength(1);

    const projeto = portfolio.projetos[0];
    expect(projeto).toMatchObject({
      projetoId: 5,
      projetoNome: "Sistema Financeiro",
      funcao: "Backend",
      tasksVerificadas: 4,
      commits: 32,
      prsMergeados: 4,
      tecnologias: ["Node.js", "MySQL"],
      privado: false,
    });
    expect(projeto.contribuicoes).toHaveLength(2);
    expect(projeto.contribuicoes[0]).toMatchObject({
      titulo: "API de autenticação",
      prNumero: 15,
      commits: 8,
    });
  });

  it("usa o userId informado na URL", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, dados: { projetos: [] } },
    });

    await getPortfolio("99");

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/99/portfolio");
  });

  it("portfólio vazio (projetos: []) resolve sem erro", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, dados: { projetos: [] } },
    });

    const portfolio = await getPortfolio();

    expect(portfolio.projetos).toEqual([]);
  });

  it("normaliza valores ausentes/estranhos e aceita aliases de campo do backend", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          projetos: [
            {
              projetoId: "7", // string → 0 (guard numérico)
              projetoNome: "",
              funcao: null,
              tasksVerificadas: null,
              commits: 10,
              prsMergeados: 1,
              tecnologias: ["React", 123],
              contribuicoes: [
                { nome: "Ajuste no deploy", numero_pr: 42, commits: 3 },
                null, // item inválido → ignorado
              ],
            },
            {
              projetoId: 8,
              projetoNome: "Repo Privado",
              visibilidade: "privado",
              tasksVerificadas: 2,
              commits: 5,
              prsMergeados: 0,
              tecnologias: [],
              contribuicoes: [],
            },
          ],
        },
      },
    });

    const portfolio = await getPortfolio("7");

    expect(portfolio.projetos).toHaveLength(2);

    const primeiro = portfolio.projetos[0];
    expect(primeiro).toMatchObject({
      projetoId: 0,
      projetoNome: "Projeto", // nome vazio → fallback
      funcao: undefined,
      tasksVerificadas: 0,
      commits: 10,
      prsMergeados: 1,
      tecnologias: ["React", "123"], // map(String)
      privado: false,
    });
    // alias numero_pr → prNumero
    expect(primeiro.contribuicoes[0]).toMatchObject({
      titulo: "Ajuste no deploy",
      prNumero: 42,
    });
    // item null é filtrado
    expect(primeiro.contribuicoes).toHaveLength(1);

    // ETAPA 14 (futura): visibilidade privado → flag privado sem vazar detalhes
    expect(portfolio.projetos[1]).toMatchObject({
      projetoId: 8,
      projetoNome: "Repo Privado",
      privado: true,
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

    await expect(getPortfolio("999")).rejects.toThrow("Usuário não encontrado");
  });

  it("erro sem mensagem rejeita com o fallback amigável", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    await expect(getPortfolio()).rejects.toThrow("Não foi possível carregar o portfólio.");
  });

  it("resposta inválida (sucesso false) lança erro explícito", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, dados: null } });

    await expect(getPortfolio()).rejects.toThrow("Resposta de portfólio inválida do servidor.");
  });
});
