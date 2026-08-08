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

import { candidatarComVaga } from "./candidaturas";

describe("candidatarComVaga", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("faz POST /projetos/:id/candidaturas com vaga_id e mensagem (candidatura direcionada)", async () => {
    mocks.post.mockResolvedValue({
      data: { sucesso: true, message: "Candidatura enviada com sucesso" },
    });

    await candidatarComVaga("7", { vaga_id: 12, mensagem: "Quero contribuir no backend" });

    expect(mocks.post).toHaveBeenCalledWith("/projetos/7/candidaturas", {
      vaga_id: 12,
      mensagem: "Quero contribuir no backend",
    });
  });

  it("sem vaga_id omite a chave do payload (candidatura livre)", async () => {
    mocks.post.mockResolvedValue({
      data: { sucesso: true, message: "Candidatura enviada com sucesso" },
    });

    await candidatarComVaga("7", { mensagem: "Gostaria de participar!" });

    expect(mocks.post).toHaveBeenCalledWith("/projetos/7/candidaturas", {
      mensagem: "Gostaria de participar!",
    });
  });

  it("com erro 400 (candidatura duplicada) rejeita com a mensagem do backend", async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: "Você já possui uma candidatura pendente para este projeto" },
      },
    });

    await expect(
      candidatarComVaga("7", { vaga_id: 12, mensagem: "Quero contribuir no backend" }),
    ).rejects.toThrow("Você já possui uma candidatura pendente para este projeto");
  });

  it("com erro 409 (vaga fechada/indisponível) rejeita com a mensagem do backend", async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: "A vaga informada não está disponível" },
      },
    });

    await expect(
      candidatarComVaga("7", { vaga_id: 12, mensagem: "Quero contribuir no backend" }),
    ).rejects.toThrow("A vaga informada não está disponível");
  });

  it("com sucesso:false na resposta rejeita com a mensagem retornada", async () => {
    mocks.post.mockResolvedValue({
      data: { sucesso: false, message: "Você não pode se candidatar ao seu próprio projeto" },
    });

    await expect(candidatarComVaga("7", { mensagem: "oi" })).rejects.toThrow(
      "Você não pode se candidatar ao seu próprio projeto",
    );
  });
});
