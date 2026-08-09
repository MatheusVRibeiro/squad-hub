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

import { fetchRecomendacoes } from "./matching";

describe("fetchRecomendacoes (ETAPA 16 — matching desenvolvedor ↔ projeto)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia dados.recomendacoes com projeto aninhado (snake_case) para o contrato do frontend", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "Projetos recomendados",
        nItens: 1,
        dados: {
          recomendacoes: [
            {
              projeto: {
                id: 12,
                titulo: "App de entregas",
                descricao: "Plataforma de logística urbana",
                tecnologias: ["Node.js", "React"],
              },
              score: 87,
              fatores: {
                habilidades: { percentual: 90 },
                funcao: { percentual: 75 },
                nivel: { percentual: 80 },
                disponibilidade: { percentual: 100 },
                outras: { percentual: 60 },
              },
              explicacao: [
                "Suas habilidades batem com as exigidas pelo projeto.",
                "Sua disponibilidade é compatível com a carga esperada.",
              ],
            },
          ],
        },
      },
    });

    const recomendacoes = await fetchRecomendacoes();

    expect(mocks.get).toHaveBeenCalledWith("/matching/projetos");
    expect(recomendacoes).toHaveLength(1);
    expect(recomendacoes[0]).toMatchObject({
      projetoId: 12,
      titulo: "App de entregas",
      descricao: "Plataforma de logística urbana",
      tecnologias: ["Node.js", "React"],
      score: 87,
      fatores: {
        habilidades: { percentual: 90 },
        funcao: { percentual: 75 },
      },
      explicacao: [
        "Suas habilidades batem com as exigidas pelo projeto.",
        "Sua disponibilidade é compatível com a carga esperada.",
      ],
    });
  });

  it("mapeia dados como array direto com item achatado (camelCase)", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            projetoId: 7,
            projetoNome: "Portal do cidadão",
            descricao: "Sistema de serviços públicos",
            tecnologias: ["React", "PostgreSQL"],
            score: 92.5,
            fatores: { nivel: { percentual: 85 } },
          },
        ],
      },
    });

    const recomendacoes = await fetchRecomendacoes();

    expect(recomendacoes).toHaveLength(1);
    expect(recomendacoes[0]).toMatchObject({
      projetoId: 7,
      titulo: "Portal do cidadão",
      tecnologias: ["React", "PostgreSQL"],
      score: 92.5,
      fatores: { nivel: { percentual: 85 } },
    });
  });

  it("normaliza tecnologias como string '||', score string e filtra itens sem id", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          recomendacoes: [
            {
              projeto: { id: 3, nome: "Fintech", tecnologias: "Node.js||NestJS||MySQL" },
              score: "78",
            },
            { projeto: { nome: "Sem id" }, score: 50 },
            null,
          ],
        },
      },
    });

    const recomendacoes = await fetchRecomendacoes();

    expect(recomendacoes).toHaveLength(1);
    expect(recomendacoes[0]).toMatchObject({
      projetoId: 3,
      titulo: "Fintech",
      tecnologias: ["Node.js", "NestJS", "MySQL"],
      score: 78,
    });
  });

  it("sem recomendações (dados.recomendacoes vazio) resolve como [] sem erro", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "Projetos recomendados",
        nItens: 0,
        dados: { recomendacoes: [] },
      },
    });

    const recomendacoes = await fetchRecomendacoes();

    expect(recomendacoes).toEqual([]);
  });

  it("erro do backend (axios) propaga a mensagem amigável do servidor", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: "Token inválido ou expirado" } },
    });

    await expect(fetchRecomendacoes()).rejects.toThrow("Token inválido ou expirado");
  });

  it("resposta inválida (sucesso false) lança erro explícito", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, message: "erro", dados: null } });

    await expect(fetchRecomendacoes()).rejects.toThrow(
      "Resposta de recomendações inválida do servidor.",
    );
  });
});
