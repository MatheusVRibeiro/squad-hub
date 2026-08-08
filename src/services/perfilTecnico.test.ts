import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import {
  getFuncoes,
  getMeuPerfilTecnico,
  atualizarPerfilTecnico,
  salvarFuncoes,
  salvarHabilidadesComNivel,
} from "./perfilTecnico";

const PERFIL = {
  id: 42,
  nome: "Ana Souza",
  email: "ana@example.com",
  bio: "Dev fullstack",
  localizacao: "SP",
  avatar_url: null,
  tipo: "usuario",
  disponibilidade_horas_semana: 20,
  objetivo_profissional: "Evoluir para tech lead",
  perfil_completo: true,
  habilidades: [{ id: 1, nome: "React", nivel: "avancado" }],
  funcoes: [{ id: 2, nome: "Frontend", nivel_interesse: "alto" }],
};

describe("getFuncoes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz GET /funcoes e retorna a lista global de funções", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        nItens: 9,
        dados: [
          { id: 1, nome: "Backend" },
          { id: 2, nome: "Frontend" },
          { id: 3, nome: "Full Stack" },
        ],
      },
    });

    const funcoes = await getFuncoes();

    expect(mocks.get).toHaveBeenCalledWith("/funcoes");
    expect(funcoes).toHaveLength(3);
    expect(funcoes[0]).toEqual({ id: 1, nome: "Backend" });
  });

  it("retorna [] quando o envelope não traz dados", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true } });

    await expect(getFuncoes()).resolves.toEqual([]);
  });
});

describe("getMeuPerfilTecnico", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz GET /usuarios/me/perfil e retorna o perfil técnico em dados", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true, dados: PERFIL } });

    const perfil = await getMeuPerfilTecnico();

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/me/perfil");
    expect(perfil.perfil_completo).toBe(true);
    expect(perfil.habilidades[0].nivel).toBe("avancado");
    expect(perfil.funcoes[0].nivel_interesse).toBe("alto");
  });

  it("lança a message do envelope quando sucesso: false", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: false, message: "Perfil técnico não encontrado" },
    });

    await expect(getMeuPerfilTecnico()).rejects.toThrow("Perfil técnico não encontrado");
  });

  it("extrai a mensagem amigável de erro Axios", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Token inválido" } },
    });

    await expect(getMeuPerfilTecnico()).rejects.toThrow("Token inválido");
  });
});

describe("atualizarPerfilTecnico", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz PATCH /usuarios/me/perfil com escalares e retorna o perfil atualizado", async () => {
    mocks.patch.mockResolvedValue({ data: { sucesso: true, dados: PERFIL } });

    const perfil = await atualizarPerfilTecnico({
      nome: "Ana Souza",
      bio: "Dev fullstack",
      localizacao: "SP",
      disponibilidade_horas_semana: 20,
      objetivo_profissional: "Evoluir para tech lead",
    });

    expect(mocks.patch).toHaveBeenCalledWith("/usuarios/me/perfil", {
      nome: "Ana Souza",
      bio: "Dev fullstack",
      localizacao: "SP",
      avatar_url: undefined,
      disponibilidade_horas_semana: 20,
      objetivo_profissional: "Evoluir para tech lead",
      funcoes: undefined,
      habilidades: undefined,
    });
    expect(perfil.perfil_completo).toBe(true);
  });

  it("propaga a message do envelope quando sucesso: false", async () => {
    mocks.patch.mockResolvedValue({
      data: { sucesso: false, message: "Disponibilidade deve ser entre 0 e 168" },
    });

    await expect(atualizarPerfilTecnico({ disponibilidade_horas_semana: 999 })).rejects.toThrow(
      "Disponibilidade deve ser entre 0 e 168",
    );
  });
});

describe("salvarFuncoes", () => {
  beforeEach(() => {
    mocks.put.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz PUT /usuarios/me/funcoes com funções e nível de interesse", async () => {
    mocks.put.mockResolvedValue({
      data: {
        sucesso: true,
        dados: { funcoes: [{ id: 2, nome: "Frontend", nivel_interesse: "alto" }] },
      },
    });

    const salvas = await salvarFuncoes([
      { nome: "Frontend", nivel_interesse: "alto" },
      { nome: "QA", nivel_interesse: "medio" },
    ]);

    expect(mocks.put).toHaveBeenCalledWith("/usuarios/me/funcoes", {
      funcoes: [
        { nome: "Frontend", nivel_interesse: "alto" },
        { nome: "QA", nivel_interesse: "medio" },
      ],
    });
    expect(salvas[0].nivel_interesse).toBe("alto");
  });

  it("lança mensagem amigável quando a função não existe (400)", async () => {
    mocks.put.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Função 'Cobol' não encontrada" } },
    });

    await expect(salvarFuncoes([{ nome: "Cobol", nivel_interesse: "alto" }])).rejects.toThrow(
      "Função 'Cobol' não encontrada",
    );
  });
});

describe("salvarHabilidadesComNivel", () => {
  beforeEach(() => {
    mocks.put.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz PUT /usuarios/me/habilidades com habilidades e nível por tecnologia", async () => {
    mocks.put.mockResolvedValue({
      data: {
        sucesso: true,
        dados: { habilidades: [{ id: 1, nome: "React", nivel: "avancado" }] },
      },
    });

    const salvas = await salvarHabilidadesComNivel([
      { nome: "React", nivel: "avancado" },
      { nome: "Node.js", nivel: "intermediario" },
    ]);

    expect(mocks.put).toHaveBeenCalledWith("/usuarios/me/habilidades", {
      habilidades: [
        { nome: "React", nivel: "avancado" },
        { nome: "Node.js", nivel: "intermediario" },
      ],
    });
    expect(salvas[0].nivel).toBe("avancado");
  });

  it("lança a message do envelope quando sucesso: false", async () => {
    mocks.put.mockResolvedValue({
      data: { sucesso: false, message: "Nível de habilidade inválido" },
    });

    await expect(
      salvarHabilidadesComNivel([{ nome: "React", nivel: "iniciante" }]),
    ).rejects.toThrow("Nível de habilidade inválido");
  });
});
