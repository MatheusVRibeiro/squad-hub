import { afterEach, describe, expect, it, vi } from "vitest";

// Mock do módulo ./api — o service nunca toca axios real nos testes.
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import { atualizarVisibilidadeProjeto, fetchProjectDetail } from "./projectDetail";

describe("atualizarVisibilidadeProjeto (ETAPA 14 — privacidade do projeto)", () => {
  it("envia PATCH /projetos/:id com visibilidade (contrato snake_case do backend)", async () => {
    mocks.patch.mockResolvedValue({ data: { sucesso: true, message: "ok", dados: null } });

    await atualizarVisibilidadeProjeto("7", { visibilidade: "privado" });

    expect(mocks.patch).toHaveBeenCalledWith("/projetos/7", { visibilidade: "privado" });
  });

  it("converte permitirPortfolioPublico (camelCase da UI) para permitir_portfolio_publico", async () => {
    mocks.patch.mockResolvedValue({ data: { sucesso: true, dados: null } });

    await atualizarVisibilidadeProjeto(7, { permitirPortfolioPublico: false });

    expect(mocks.patch).toHaveBeenCalledWith("/projetos/7", {
      permitir_portfolio_publico: false,
    });
  });

  it("envia os dois campos juntos quando ambos mudam", async () => {
    mocks.patch.mockResolvedValue({ data: { sucesso: true, dados: null } });

    await atualizarVisibilidadeProjeto("7", {
      visibilidade: "publico",
      permitirPortfolioPublico: true,
    });

    expect(mocks.patch).toHaveBeenCalledWith("/projetos/7", {
      visibilidade: "publico",
      permitir_portfolio_publico: true,
    });
  });

  it("omite campos não alterados do payload (apenas o que mudou é enviado)", async () => {
    mocks.patch.mockResolvedValue({ data: { sucesso: true, dados: null } });

    await atualizarVisibilidadeProjeto("7", { visibilidade: "privado" });

    const payload = mocks.patch.mock.calls[0][1];
    expect(payload).toEqual({ visibilidade: "privado" });
    expect(payload).not.toHaveProperty("permitir_portfolio_publico");
  });

  it("erro 403 (somente dono) rejeita com a mensagem amigável do servidor", async () => {
    mocks.patch.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: "Somente o dono do projeto pode alterar a visibilidade" },
      },
    });

    await expect(atualizarVisibilidadeProjeto("7", { visibilidade: "privado" })).rejects.toThrow(
      "Somente o dono do projeto pode alterar a visibilidade",
    );
  });

  it("erro sem mensagem rejeita com o fallback amigável (sem mock silencioso)", async () => {
    mocks.patch.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: {} } });

    await expect(atualizarVisibilidadeProjeto("7", { visibilidade: "privado" })).rejects.toThrow(
      "Não foi possível atualizar a privacidade do projeto.",
    );
  });
});

describe("fetchProjectDetail — mapeamento ETAPA 14 (visibilidade / portfólio público)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mapeia permitir_portfolio_publico=false (snake) e mantém visibilidade do GET", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "ok",
        dados: {
          id: 9,
          name: "Squad X",
          visibilidade: "privado",
          permitir_portfolio_publico: false,
        },
      },
    });

    const detail = await fetchProjectDetail("9");

    expect(detail.visibilidade).toBe("privado");
    expect(detail.permitirPortfolioPublico).toBe(false);
  });

  it("aceita a variante camelCase permitirPortfolioPublico=false", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          id: 10,
          name: "Squad Y",
          visibilidade: "publico",
          permitirPortfolioPublico: false,
        },
      },
    });

    const detail = await fetchProjectDetail("10");

    expect(detail.visibilidade).toBe("publico");
    expect(detail.permitirPortfolioPublico).toBe(false);
  });

  it("campos ausentes (backend pré-ETAPA 14) mantêm o DEFAULT do schema (true) e visibilidade indefinida", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: { id: 11, name: "Squad Z" },
      },
    });

    const detail = await fetchProjectDetail("11");

    expect(detail.permitirPortfolioPublico).toBe(true);
    expect(detail.visibilidade).toBeUndefined();
  });

  it("em PROD, resposta inválida lança erro explícito (sem fallback mock)", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockResolvedValue({ data: { sucesso: false, dados: null } });

    await expect(fetchProjectDetail("9")).rejects.toThrow(
      "Projeto 9 não encontrado ou resposta inesperada.",
    );
  });
});
