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

import {
  getUserGithubStatus,
  getGithubConnectUrl,
  disconnectGithubAccount,
  ERRO_SENHA_NECESSARIA,
  type UserGithubStatus,
} from "./github";

describe("services/github.ts — ETAPA 2 (conectar/desconectar com regra de senha)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getUserGithubStatus expõe senha_definida e cadastro_origem (contrato com /github/me)", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          conectado: true,
          github_user_id: 90573780,
          github_login: "MatheusVRibeiro",
          github_avatar_url: "https://a",
          github_connected_at: "2026-08-08T00:00:00Z",
          senha_definida: false,
          cadastro_origem: "github",
        } satisfies UserGithubStatus,
      },
    });
    const status = await getUserGithubStatus();
    expect(mocks.get).toHaveBeenCalledWith("/github/me");
    expect(status.senha_definida).toBe(false);
    expect(status.cadastro_origem).toBe("github");
  });

  it("disconnectGithubAccount propaga 409 (senha local obrigatória) como erro amigável", async () => {
    // Formato de erro do axios (backend responde 409 com a mensagem da regra)
    const erro409 = Object.assign(new Error("Request failed with status code 409"), {
      isAxiosError: true,
      response: {
        status: 409,
        data: { sucesso: false, message: ERRO_SENHA_NECESSARIA, dados: null },
      },
    });
    mocks.delete.mockRejectedValue(erro409);

    await expect(disconnectGithubAccount()).rejects.toThrow(ERRO_SENHA_NECESSARIA);
    expect(mocks.delete).toHaveBeenCalledWith("/github/disconnect");
  });

  it("disconnectGithubAccount desconecta com sucesso quando a senha está definida", async () => {
    mocks.delete.mockResolvedValue({ data: { sucesso: true, dados: null } });
    await expect(disconnectGithubAccount()).resolves.toBeUndefined();
    expect(mocks.delete).toHaveBeenCalledWith("/github/disconnect");
  });

  it("ERRO_SENHA_NECESSARIA alinha com a mensagem do backend (409)", () => {
    expect(ERRO_SENHA_NECESSARIA).toBe("Crie uma senha local antes de desconectar o GitHub");
  });

  it("getGithubConnectUrl continua retornando URL OAuth para o card de conexão", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: { url: "https://github.com/login/oauth/authorize?client_id=x", state: "abc" },
      },
    });
    const { url, state } = await getGithubConnectUrl();
    expect(url).toContain("github.com/login/oauth/authorize");
    expect(state).toBe("abc");
  });
});
