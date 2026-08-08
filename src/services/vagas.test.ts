import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock do módulo ./api — os services nunca tocam axios real nos testes.
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import { atualizarVaga, criarVaga, excluirVaga, getVagasProjeto } from "./vagas";

describe("getVagasProjeto", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz GET /projetos/:id/vagas e mapeia snake_case → tipo Vaga da UI", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 12,
            projeto_id: 7,
            funcao_id: 1,
            funcao_nome: "Backend",
            quantidade: 2,
            preenchidas: 1,
            descricao: "API com Node.js",
            nivel_desejado: "intermediario",
            status: "aberta",
          },
          {
            id: 13,
            projeto_id: 7,
            funcao_id: 2,
            funcao_nome: "Frontend",
            quantidade: 1,
            preenchidas: 0,
            descricao: null,
            nivel_desejado: "qualquer",
            status: "fechada",
          },
        ],
      },
    });

    const vagas = await getVagasProjeto("7");

    expect(mocks.get).toHaveBeenCalledWith("/projetos/7/vagas");
    expect(vagas).toHaveLength(2);
    expect(vagas[0]).toEqual({
      id: "12",
      projeto_id: 7,
      funcao_id: 1,
      funcao_nome: "Backend",
      quantidade: 2,
      preenchidas: 1,
      descricao: "API com Node.js",
      nivel_desejado: "intermediario",
      status: "aberta",
    });
    expect(vagas[1].status).toBe("fechada");
    expect(vagas[1].nivel_desejado).toBe("qualquer");
  });

  it("com resposta sem dados (sucesso true, dados ausente) retorna []", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true } });

    const vagas = await getVagasProjeto("7");

    expect(vagas).toEqual([]);
  });
});

describe("criarVaga", () => {
  it("faz POST /projetos/:id/vagas com payload snake_case e retorna a vaga criada", async () => {
    mocks.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          id: 20,
          projeto_id: 7,
          funcao_id: 3,
          funcao_nome: "Full Stack",
          quantidade: 1,
          preenchidas: 0,
          descricao: "App completo",
          nivel_desejado: "avancado",
          status: "aberta",
        },
      },
    });

    const vaga = await criarVaga("7", {
      funcao_id: 3,
      quantidade: 1,
      descricao: "App completo",
      nivel_desejado: "avancado",
      status: "aberta",
    });

    expect(mocks.post).toHaveBeenCalledWith("/projetos/7/vagas", {
      funcao_id: 3,
      quantidade: 1,
      descricao: "App completo",
      nivel_desejado: "avancado",
      status: "aberta",
    });
    expect(vaga.id).toBe("20");
    expect(vaga.funcao_nome).toBe("Full Stack");
    expect(vaga.quantidade).toBe(1);
  });

  it("aplica defaults (nivel qualquer, status aberta, descricao null) quando ausentes", async () => {
    mocks.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: { id: 21, funcao_id: 5, funcao_nome: "QA", quantidade: 1 },
      },
    });

    await criarVaga("7", { funcao_id: 5, quantidade: 1 });

    expect(mocks.post).toHaveBeenCalledWith("/projetos/7/vagas", {
      funcao_id: 5,
      quantidade: 1,
      descricao: null,
      nivel_desejado: "qualquer",
      status: "aberta",
    });
  });
});

describe("atualizarVaga", () => {
  it("faz PATCH /projetos/:id/vagas/:vagaId com payload parcial e retorna a vaga atualizada", async () => {
    mocks.patch.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          id: 12,
          funcao_id: 1,
          funcao_nome: "Backend",
          quantidade: 3,
          preenchidas: 1,
          nivel_desejado: "intermediario",
          status: "fechada",
        },
      },
    });

    const vaga = await atualizarVaga("7", "12", { quantidade: 3, status: "fechada" });

    expect(mocks.patch).toHaveBeenCalledWith("/projetos/7/vagas/12", {
      funcao_id: undefined,
      quantidade: 3,
      descricao: undefined,
      nivel_desejado: undefined,
      status: "fechada",
    });
    expect(vaga.id).toBe("12");
    expect(vaga.quantidade).toBe(3);
    expect(vaga.status).toBe("fechada");
  });
});

describe("excluirVaga", () => {
  it("faz DELETE /projetos/:id/vagas/:vagaId e resolve em sucesso", async () => {
    mocks.delete.mockResolvedValue({ data: { sucesso: true } });

    await expect(excluirVaga("7", "12")).resolves.toBeUndefined();

    expect(mocks.delete).toHaveBeenCalledWith("/projetos/7/vagas/12");
  });

  it("com erro 409 (vaga possui membros vinculados) rejeita com a mensagem do backend", async () => {
    mocks.delete.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: "Vaga possui membros vinculados" },
      },
    });

    await expect(excluirVaga("7", "12")).rejects.toThrow("Vaga possui membros vinculados");
  });
});
