import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock do módulo ./api — os services nunca tocam axios real nos testes.
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import { MOCK_PROJECTS, fetchProjects, requestProjectJoin } from "./projects";

describe("fetchProjects", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia snake_case → camelCase e normaliza status/urls", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 7,
            criador_id: 1,
            criador_nome: "Ana Souza",
            titulo: "App Mobile",
            descricao: "App de delivery",
            status: "em_andamento",
            limite_membros: 5,
            criado_em: "2026-07-01T10:00:00.000Z",
            total_membros: 3,
            repositorio_url: "https://github.com/x/app",
            figma_url: null,
            discord_url: undefined,
            documentacao_url: null,
            tecnologias: ["React", "Node.js"],
          },
        ],
      },
    });

    const projects = await fetchProjects();

    expect(mocks.get).toHaveBeenCalledWith("/projetos");
    expect(projects).toHaveLength(1);
    const p = projects[0];
    expect(p.id).toBe("7");
    expect(p.name).toBe("App Mobile");
    expect(p.description).toBe("App de delivery");
    expect(p.status).toBe("Em andamento");
    expect(p.technologies).toEqual(["React", "Node.js"]);
    expect(p.membersCount).toBe(3);
    expect(p.membersLimit).toBe(5);
    expect(p.createdBy).toBe("Ana Souza");
    expect(p.createdAt).toBe("2026-07-01T10:00:00.000Z");
    expect(p.repositorioUrl).toBe("https://github.com/x/app");
    expect(p.figmaUrl).toBeUndefined();
    expect(p.discordUrl).toBeUndefined();
    expect(p.documentacaoUrl).toBeUndefined();
  });

  it("normaliza tecnologias: string '||' → array e null/ausente → []", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 1,
            criador_id: 2,
            criador_nome: null,
            titulo: "Legado",
            descricao: null,
            status: "aberto",
            limite_membros: 4,
            criado_em: "2026-01-01T00:00:00.000Z",
            total_membros: 1,
            tecnologias: "React||Node.js",
          },
          {
            id: 2,
            criador_id: 2,
            criador_nome: null,
            titulo: "Sem stack",
            descricao: null,
            status: "finalizado",
            limite_membros: 4,
            criado_em: "2026-01-01T00:00:00.000Z",
            total_membros: 1,
            tecnologias: null,
          },
        ],
      },
    });

    const projects = await fetchProjects();

    expect(projects[0].technologies).toEqual(["React", "Node.js"]);
    expect(projects[0].status).toBe("Aberto");
    expect(projects[1].technologies).toEqual([]);
    expect(projects[1].status).toBe("Finalizado");
    expect(projects[0].createdBy).toBe("Desconhecido");
  });

  it("com resposta válida o caminho real é usado (fallback mock NÃO entra)", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 9,
            criador_id: 1,
            criador_nome: null,
            titulo: "Projeto Real",
            descricao: null,
            status: "aberto",
            limite_membros: 4,
            criado_em: "2026-01-01T00:00:00.000Z",
            total_membros: 1,
          },
        ],
      },
    });

    const projects = await fetchProjects();

    // Dados reais mapeados, não MOCK_PROJECTS
    expect(projects[0].name).toBe("Projeto Real");
    expect(projects).not.toEqual(MOCK_PROJECTS);
    // Em DEV o resultado é persistido no localStorage (prova do caminho real)
    const stored = JSON.parse(window.localStorage.getItem("@montesquad:projects")!);
    expect(stored[0].name).toBe("Projeto Real");
  });

  it("em DEV, erro de rede cai no fallback mock local", async () => {
    mocks.get.mockRejectedValue(new Error("backend offline"));

    const projects = await fetchProjects();

    expect(projects).toEqual(MOCK_PROJECTS);
  });

  it("em PROD, erro de rede NÃO cai em mock — lança o erro", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockRejectedValue(new Error("network down"));

    await expect(fetchProjects()).rejects.toThrow("network down");
  });

  it("em PROD, resposta inválida (sucesso: false) lança erro explícito", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockResolvedValue({ data: { sucesso: false } });

    await expect(fetchProjects()).rejects.toThrow(
      "Resposta inesperada do servidor ao listar projetos.",
    );
  });
});

describe("requestProjectJoin", () => {
  it("envia a candidatura via api.post", async () => {
    mocks.post.mockResolvedValue({ data: { sucesso: true } });

    await expect(requestProjectJoin("42")).resolves.toBeUndefined();

    expect(mocks.post).toHaveBeenCalledWith("/projetos/42/candidaturas", {
      mensagem: "Gostaria de participar do projeto!",
    });
  });

  it("falha silenciosamente (best-effort) em caso de erro", async () => {
    vi.useFakeTimers();
    mocks.post.mockRejectedValue(new Error("offline"));

    const promise = requestProjectJoin("42");
    await vi.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
