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

import { USER_KEY } from "./api";
import { syncUserSkills, updateUserProfile } from "./perfil";

const USER_STORED = JSON.stringify({ id: 42, nome: "Ana Souza" });

describe("updateUserProfile", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz PATCH /usuarios/:id com o id do usuário autenticado", async () => {
    window.localStorage.setItem(USER_KEY, USER_STORED);
    mocks.patch.mockResolvedValue({ data: { sucesso: true, message: "ok" } });

    const envelope = await updateUserProfile({
      nome: "Ana Souza",
      bio: "Dev fullstack",
      localizacao: "SP",
    });

    expect(mocks.patch).toHaveBeenCalledWith("/usuarios/42", {
      nome: "Ana Souza",
      bio: "Dev fullstack",
      localizacao: "SP",
    });
    expect(envelope.sucesso).toBe(true);
  });

  it("lança 'Usuário não autenticado.' sem usuário no localStorage", async () => {
    await expect(updateUserProfile({ nome: "X" })).rejects.toThrow("Usuário não autenticado.");
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it("propaga a message do envelope quando sucesso: false", async () => {
    window.localStorage.setItem(USER_KEY, USER_STORED);
    mocks.patch.mockResolvedValue({
      data: { sucesso: false, message: "E-mail inválido" },
    });

    await expect(updateUserProfile({ nome: "X" })).rejects.toThrow("E-mail inválido");
  });

  it("extrai a mensagem amigável de erro Axios (response.data.message)", async () => {
    window.localStorage.setItem(USER_KEY, USER_STORED);
    mocks.patch.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Nome muito curto" } },
    });

    await expect(updateUserProfile({ nome: "A" })).rejects.toThrow("Nome muito curto");
  });
});

describe("syncUserSkills", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normaliza acentos e vincula as skills correspondentes (best-effort)", async () => {
    window.localStorage.setItem(USER_KEY, USER_STORED);
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          { id: 1, nome: "Análise de dados" },
          { id: 2, nome: "React" },
          { id: 3, nome: "Node.js" },
        ],
      },
    });
    mocks.post.mockResolvedValue({ data: { sucesso: true } });

    // "Analise de dados" (sem acento) casa com "Análise de dados" via NFD
    const result = await syncUserSkills(["Analise de dados", "react", "Node.js"]);

    expect(mocks.get).toHaveBeenCalledWith("/habilidades");
    expect(mocks.post).toHaveBeenCalledWith("/habilidades-usuario", {
      usuario_id: 42,
      habilidade_id: 1,
      nivel: "iniciante",
    });
    expect(mocks.post).toHaveBeenCalledWith("/habilidades-usuario", {
      usuario_id: 42,
      habilidade_id: 2,
      nivel: "iniciante",
    });
    expect(mocks.post).toHaveBeenCalledWith("/habilidades-usuario", {
      usuario_id: 42,
      habilidade_id: 3,
      nivel: "iniciante",
    });
    expect(result).toEqual({ added: 3, skipped: [] });
  });

  it("pula skills sem correspondência na base global (console.warn)", async () => {
    window.localStorage.setItem(USER_KEY, USER_STORED);
    mocks.get.mockResolvedValue({
      data: { sucesso: true, dados: [{ id: 1, nome: "React" }] },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await syncUserSkills(["React", "Cobol"]);

    expect(result).toEqual({ added: 1, skipped: ["Cobol"] });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it("não vincula a mesma habilidade duas vezes (dedup por id)", async () => {
    window.localStorage.setItem(USER_KEY, USER_STORED);
    mocks.get.mockResolvedValue({
      data: { sucesso: true, dados: [{ id: 5, nome: "Python" }] },
    });
    mocks.post.mockResolvedValue({ data: { sucesso: true } });

    const result = await syncUserSkills(["Python", "  python "]);

    expect(result).toEqual({ added: 2, skipped: [] });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith("/habilidades-usuario", {
      usuario_id: 42,
      habilidade_id: 5,
      nivel: "iniciante",
    });
  });

  it("lança 'Usuário não autenticado.' sem usuário logado", async () => {
    await expect(syncUserSkills(["React"])).rejects.toThrow("Usuário não autenticado.");
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
