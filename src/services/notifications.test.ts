import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  type AppNotification,
  fetchNotifications,
  getLocalNotifications,
  markAllRead,
} from "./notifications";

describe("fetchNotifications", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia snake_case → camelCase e ordena da mais recente para a mais antiga", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "ok",
        nItens: 2,
        dados: [
          {
            id: "n-old",
            tipo: "task",
            titulo: "Tarefa atribuída",
            descricao: "x",
            link: null,
            lida: true,
            criado_em: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "n-new",
            tipo: "message",
            titulo: "Nova mensagem",
            descricao: "y",
            link: "/projetos/1",
            lida: false,
            criado_em: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
    });

    const list = await fetchNotifications();

    expect(mocks.get).toHaveBeenCalledWith("/notificacoes");
    // Sort: mais recente primeiro
    expect(list.map((n) => n.id)).toEqual(["n-new", "n-old"]);
    expect(list[0]).toMatchObject({
      type: "message",
      title: "Nova mensagem",
      createdAt: "2026-02-01T00:00:00.000Z",
      read: false,
      link: "/projetos/1",
    });
    // link null → undefined
    expect(list[1].link).toBeUndefined();
    expect(list[1]).toMatchObject({ type: "task", title: "Tarefa atribuída", read: true });
  });

  it("aceita resposta no formato array direto (variante do backend)", async () => {
    mocks.get.mockResolvedValue({
      data: [
        {
          id: "n1",
          tipo: "system",
          titulo: "Bem-vindo",
          descricao: "d",
          lida: true,
          criado_em: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const list = await fetchNotifications();

    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Bem-vindo");
    expect(list[0].type).toBe("system");
  });

  it("em DEV, erro de rede cai no fallback local ordenado (mock)", async () => {
    mocks.get.mockRejectedValue(new Error("backend offline"));

    const list = await fetchNotifications();

    expect(list).toEqual(getLocalNotifications());
    expect(list[0].id).toBe("n1");
  });

  it("em PROD, erro de rede é propagado (sem fallback)", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockRejectedValue(new Error("network down"));

    await expect(fetchNotifications()).rejects.toThrow("network down");
  });

  it("em PROD, resposta sem array (dados ausente) lança erro explícito", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockResolvedValue({ data: { sucesso: true } });

    await expect(fetchNotifications()).rejects.toThrow("Resposta inesperada de GET /notificacoes");
  });
});

describe("markAllRead", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("chama POST /notificacoes/ler-tudo e sincroniza o local em DEV", async () => {
    window.localStorage.setItem(
      "@montesquad:notifications",
      JSON.stringify([
        {
          id: "n1",
          type: "task",
          title: "T",
          description: "D",
          createdAt: "2026-01-01T00:00:00.000Z",
          read: false,
        },
      ] satisfies AppNotification[]),
    );
    mocks.post.mockResolvedValue({ data: { sucesso: true } });

    await markAllRead();

    expect(mocks.post).toHaveBeenCalledWith("/notificacoes/ler-tudo");
    const stored = JSON.parse(
      window.localStorage.getItem("@montesquad:notifications")!,
    ) as AppNotification[];
    expect(stored[0].read).toBe(true);
  });

  it("em PROD, erro é propagado", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.post.mockRejectedValue(new Error("network down"));

    await expect(markAllRead()).rejects.toThrow("network down");
  });
});
