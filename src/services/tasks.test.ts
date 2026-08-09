import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { fetchProjectTasks } from "./tasks";
import { addLocalTask } from "./projectDetail";

describe("fetchProjectTasks (ETAPA 7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mapeia dificuldade e habilidades (objetos {id, nome}) do backend", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 1,
            projeto_id: 9,
            responsavel_id: null,
            titulo: "Criar API de Login",
            descricao: null,
            status: "todo",
            prioridade: "high",
            data_vencimento: null,
            dificuldade: "avancada",
            habilidades: [
              { id: 1, nome: "Node.js" },
              { id: 7, nome: "JWT" },
              { id: 9, nome: "Express" },
            ],
          },
        ],
      },
    });

    const tasks = await fetchProjectTasks("9");

    expect(mocks.get).toHaveBeenCalledWith("/projetos/9/tarefas");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "1",
      title: "Criar API de Login",
      dificuldade: "avancada",
      habilidades: ["Node.js", "JWT", "Express"],
      habilidadeIds: [1, 7, 9],
    });
  });

  it("aceita habilidades como array de nomes (strings)", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 2,
            projeto_id: 9,
            responsavel_id: null,
            titulo: "Landing page",
            descricao: null,
            status: "doing",
            prioridade: "medium",
            data_vencimento: null,
            dificuldade: "iniciante",
            habilidades: ["React", "Tailwind"],
          },
        ],
      },
    });

    const tasks = await fetchProjectTasks("9");

    expect(tasks[0].dificuldade).toBe("iniciante");
    expect(tasks[0].habilidades).toEqual(["React", "Tailwind"]);
  });

  it("é retrocompatível quando dificuldade/habilidades estão ausentes", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 3,
            projeto_id: 9,
            responsavel_id: null,
            titulo: "Tarefa antiga",
            descricao: null,
            status: "done",
            prioridade: "low",
            data_vencimento: null,
          },
        ],
      },
    });

    const tasks = await fetchProjectTasks("9");

    expect(tasks[0].dificuldade).toBeUndefined();
    expect(tasks[0].habilidades).toEqual([]);
    expect(tasks[0].habilidadeIds).toEqual([]);
  });

  it("lança erro quando a resposta é inesperada", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, message: "nada" } });

    await expect(fetchProjectTasks("9")).rejects.toThrow(
      "Resposta inesperada do servidor ao listar tarefas.",
    );
  });

  it("ETAPA 10: descarta tarefas arquivadas (excluida_em não-nulo) do Kanban", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 10,
            projeto_id: 9,
            responsavel_id: null,
            titulo: "Tarefa ativa",
            descricao: null,
            status: "todo",
            prioridade: "medium",
            data_vencimento: null,
            excluida_em: null,
          },
          {
            id: 11,
            projeto_id: 9,
            responsavel_id: null,
            titulo: "Tarefa arquivada",
            descricao: null,
            status: "done",
            prioridade: "low",
            data_vencimento: null,
            excluida_em: "2026-08-01T12:00:00.000Z",
          },
        ],
      },
    });

    const tasks = await fetchProjectTasks("9");

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: "10", title: "Tarefa ativa" });
    expect(tasks.some((t) => t.title === "Tarefa arquivada")).toBe(false);
  });
});

describe("addLocalTask com dificuldade e habilidades (ETAPA 7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("envia POST /projetos/:id/tarefas com dificuldade e habilidades (ids)", async () => {
    mocks.post.mockResolvedValue({
      data: {
        sucesso: true,
        message: "Tarefa criada com sucesso",
        dados: {
          id: 41,
          projeto_id: "9",
          responsavel_id: null,
          titulo: "Criar API de Login",
          descricao: "Autenticação JWT",
          status: "todo",
          prioridade: "high",
          data_vencimento: null,
          dificuldade: "avancada",
          habilidades: [
            { id: 1, nome: "Node.js" },
            { id: 7, nome: "JWT" },
          ],
        },
      },
    });

    const created = await addLocalTask("9", "Criar API de Login", {
      description: "Autenticação JWT",
      priority: "high",
      dificuldade: "avancada",
      habilidadeIds: [1, 7],
      habilidades: ["Node.js", "JWT"],
    });

    expect(mocks.post).toHaveBeenCalledWith("/projetos/9/tarefas", {
      titulo: "Criar API de Login",
      descricao: "Autenticação JWT",
      prioridade: "high",
      data_vencimento: null,
      responsavel_id: null,
      dificuldade: "avancada",
      habilidades: [1, 7],
    });
    expect(created).toMatchObject({
      id: "41",
      title: "Criar API de Login",
      dificuldade: "avancada",
      habilidadeIds: [1, 7],
      habilidades: ["Node.js", "JWT"],
    });
  });

  it("padroniza dificuldade para 'intermediaria' quando não informada", async () => {
    mocks.post.mockResolvedValue({
      data: {
        sucesso: true,
        message: "Tarefa criada com sucesso",
        dados: {
          id: 42,
          projeto_id: "9",
          responsavel_id: null,
          titulo: "Tarefa simples",
          descricao: null,
          status: "todo",
          prioridade: "medium",
          data_vencimento: null,
        },
      },
    });

    await addLocalTask("9", "Tarefa simples", { habilidades: [] });

    expect(mocks.post).toHaveBeenCalledWith(
      "/projetos/9/tarefas",
      expect.objectContaining({
        dificuldade: "intermediaria",
        habilidades: [],
      }),
    );
  });
});
