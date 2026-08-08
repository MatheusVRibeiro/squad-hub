import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock do módulo ./api — os services nunca tocam axios real nos testes.
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import { getGithubAuthUrl, completeGithubProfile } from "./githubAuth";

describe("services/githubAuth.ts (Evolução ETAPA 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getGithubAuthUrl desembrulha envelope e retorna URL OAuth com state", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        message: "URL de autorização",
        dados: {
          url: "https://github.com/login/oauth/authorize?client_id=x&state=abc123",
          state: "abc123",
        },
      },
    });
    const { url, state } = await getGithubAuthUrl();
    expect(mocks.get).toHaveBeenCalledWith("/auth/github");
    expect(url).toContain("github.com/login/oauth/authorize");
    expect(state).toBe("abc123");
  });

  it("getGithubAuthUrl lança erro amigável quando dados ausentes", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: false, message: "GitHub indisponível", dados: null },
    });
    await expect(getGithubAuthUrl()).rejects.toThrow("GitHub indisponível");
  });

  it("completeGithubProfile faz POST com Bearer e desembrulha token + dados", async () => {
    mocks.post.mockResolvedValue({
      data: {
        sucesso: true,
        message: "Perfil completado",
        token: "jwt-novo",
        dados: {
          id: 42,
          nome: "Maria Silva",
          email: "maria@example.com",
          tipo: "user",
          bio: "Dev frontend",
          localizacao: "MG",
          avatar_url: null,
          github_login: "maria",
          github_avatar_url: "https://avatars.githubusercontent.com/u/42",
          cadastro_origem: "github",
        },
      },
    });
    const result = await completeGithubProfile(
      { nome: "Maria Silva", bio: "Dev frontend", localizacao: "MG" },
      "jwt-callback",
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "/auth/github/complete-profile",
      { nome: "Maria Silva", bio: "Dev frontend", localizacao: "MG" },
      { headers: { Authorization: "Bearer jwt-callback" } },
    );
    expect(result.token).toBe("jwt-novo");
    expect(result.dados.nome).toBe("Maria Silva");
    expect(result.dados.cadastro_origem).toBe("github");
  });

  it("completeGithubProfile lança erro amigável quando sucesso=false", async () => {
    mocks.post.mockResolvedValue({
      data: { sucesso: false, message: "Token inválido ou expirado", dados: null },
    });
    await expect(completeGithubProfile({ nome: "Maria" }, "jwt-invalido")).rejects.toThrow(
      "Token inválido ou expirado",
    );
  });
});
