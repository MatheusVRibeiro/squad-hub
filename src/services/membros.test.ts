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

import { sairDoProjeto } from "./membros";

describe("sairDoProjeto (ETAPA 6 — membro sai do projeto)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz POST /projetos/:id/sair e resolve em sucesso", async () => {
    mocks.post.mockResolvedValue({
      data: { sucesso: true, message: "Você saiu do projeto com sucesso", dados: null },
    });

    await expect(sairDoProjeto("7")).resolves.toBeUndefined();

    expect(mocks.post).toHaveBeenCalledWith("/projetos/7/sair");
  });

  it("com sucesso true e sem message também resolve", async () => {
    mocks.post.mockResolvedValue({ data: { sucesso: true } });

    await expect(sairDoProjeto("7")).resolves.toBeUndefined();
  });

  it("com erro 400 (owner não pode sair) rejeita com a mensagem do backend", async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: "O proprietário do projeto não pode sair do squad" },
      },
    });

    await expect(sairDoProjeto("7")).rejects.toThrow(
      "O proprietário do projeto não pode sair do squad",
    );
  });

  it("com erro 401 (não autenticado) e sem mensagem rejeita com o fallback amigável", async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: {} },
    });

    await expect(sairDoProjeto("7")).rejects.toThrow("Não foi possível sair do projeto.");
  });
});
