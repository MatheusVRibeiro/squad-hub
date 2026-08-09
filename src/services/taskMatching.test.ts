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

import { fetchTasksRecomendadas } from "./taskMatching";

describe("fetchTasksRecomendadas (ETAPA 17 — matching desenvolvedor ↔ task)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia o contrato snake_case (taskId/titulo/compatibilidade/motivos) e monta a URL com o projeto", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "Tasks recomendadas",
        nItens: 2,
        dados: [
          {
            taskId: 41,
            titulo: "Criar endpoint de login",
            compatibilidade: 95,
            motivos: ["Você domina Node.js", "Já trabalhou com autenticação JWT"],
          },
          {
            taskId: 42,
            titulo: "Montar dashboard React",
            compatibilidade: 82,
            motivos: ["Experiência com React"],
          },
        ],
      },
    });

    const tasks = await fetchTasksRecomendadas(7);

    expect(mocks.get).toHaveBeenCalledWith("/projetos/7/tasks/recomendadas");
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      taskId: 41,
      titulo: "Criar endpoint de login",
      compatibilidade: 95,
      motivos: ["Você domina Node.js", "Já trabalhou com autenticação JWT"],
    });
    expect(tasks[1].compatibilidade).toBe(82);
  });

  it("aceita aliases camelCase/flat (id/title/score) e projetoId como string", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [{ id: 9, title: "Refatorar queries", score: "88.5", motivos: ["SQL avançado"] }],
      },
    });

    const tasks = await fetchTasksRecomendadas("abc-123");

    expect(mocks.get).toHaveBeenCalledWith("/projetos/abc-123/tasks/recomendadas");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      taskId: 9,
      titulo: "Refatorar queries",
      compatibilidade: 88.5,
      motivos: ["SQL avançado"],
    });
  });

  it("normaliza score string, filtra motivos inválidos e descarta itens sem id", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            taskId: 5,
            titulo: "Configurar CI",
            compatibilidade: "70",
            motivos: ["DevOps", 123, "", "   "],
          },
          { titulo: "Sem id", compatibilidade: 99 },
          null,
        ],
      },
    });

    const tasks = await fetchTasksRecomendadas(1);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      taskId: 5,
      titulo: "Configurar CI",
      compatibilidade: 70,
      motivos: ["DevOps"],
    });
  });

  it("sem recomendações (dados vazio) resolve como [] sem erro", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, message: "Tasks recomendadas", nItens: 0, dados: [] },
    });

    const tasks = await fetchTasksRecomendadas(3);

    expect(tasks).toEqual([]);
  });

  it("erro do backend (axios) propaga a mensagem amigável do servidor", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: "Você não é membro deste projeto" } },
    });

    await expect(fetchTasksRecomendadas(3)).rejects.toThrow("Você não é membro deste projeto");
  });

  it("resposta inválida (sucesso false) lança erro explícito", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, message: "erro", dados: null } });

    await expect(fetchTasksRecomendadas(3)).rejects.toThrow(
      "Resposta de tasks recomendadas inválida do servidor.",
    );
  });
});
