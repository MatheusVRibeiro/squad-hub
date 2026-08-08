import { afterEach, describe, expect, it, vi } from "vitest";

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

import { fetchReputation } from "./reputation";

// Payload típico de GET /usuarios/:id/reputacao (snake_case do backend).
const validDados = {
  level: 4,
  xp: 620,
  xpToNext: 1000,
  rating: 4.7,
  reviewsCount: 12,
  projectsCompleted: 5,
  achievements: [
    { id: 1, label: "Primeiro squad", description: null, icon: "rocket" },
    { id: "a2", label: "Custom", description: "x", icon: "custom-icon" },
  ],
  reviews: [
    {
      id: 2,
      author: "Ana",
      projectName: null,
      rating: 5,
      comment: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  history: [
    {
      id: 3,
      projectName: "Projeto X",
      role: "Owner",
      status: "Concluído",
      period: "Jan/2026",
      technologies: ["React", 123],
    },
    {
      id: 4,
      projectName: "Projeto Y",
      role: "Membro",
      status: "Desconhecido",
      period: "Fev/2026",
      technologies: [],
    },
  ],
};

describe("fetchReputation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("desempacota {sucesso, dados} e mapeia para o contrato do frontend", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, message: "ok", dados: validDados },
    });

    const rep = await fetchReputation();

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/me/reputacao");
    expect(rep.level).toBe(4);
    expect(rep.xp).toBe(620);
    expect(rep.xpToNext).toBe(1000);
    expect(rep.rating).toBe(4.7);
    expect(rep.reviewsCount).toBe(12);
    expect(rep.projectsCompleted).toBe(5);

    expect(rep.achievements).toHaveLength(2);
    expect(rep.achievements[0]).toMatchObject({
      id: "1",
      label: "Primeiro squad",
      description: "",
      icon: "rocket",
    });
    // Ícone fora do union → fallback "trophy"
    expect(rep.achievements[1].icon).toBe("trophy");

    expect(rep.reviews[0]).toMatchObject({
      id: "2",
      author: "Ana",
      projectName: "Projeto", // null → fallback
      comment: "", // null → fallback
    });

    expect(rep.history[0]).toMatchObject({
      role: "Owner",
      status: "Concluído",
      technologies: ["React", "123"], // map(String)
    });
    // Status fora do union → fallback "Em andamento"
    expect(rep.history[1].status).toBe("Em andamento");
    expect(rep.history[1].role).toBe("Membro");
  });

  it("usa o userId informado na URL", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true, dados: validDados } });

    await fetchReputation("99");

    expect(mocks.get).toHaveBeenCalledWith("/usuarios/99/reputacao");
  });

  it("aplica guard do xpToNext (0 → 100) para não quebrar o Progress", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: true, dados: { ...validDados, xpToNext: 0 } },
    });

    const rep = await fetchReputation();

    expect(rep.xpToNext).toBe(100);
  });

  it("em DEV, erro cai no mock local (MOCK da própria service)", async () => {
    mocks.get.mockRejectedValue(new Error("backend offline"));

    const rep = await fetchReputation();

    expect(rep.level).toBe(4);
    expect(rep.reviews).toHaveLength(3);
  });

  it("em PROD, erro de rede é propagado (sem fallback)", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockRejectedValue(new Error("network down"));

    await expect(fetchReputation()).rejects.toThrow("network down");
  });

  it("em PROD, resposta inválida lança erro explícito", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    mocks.get.mockResolvedValue({ data: { sucesso: false, dados: null } });

    await expect(fetchReputation()).rejects.toThrow("Resposta de reputação inválida do servidor.");
  });
});
