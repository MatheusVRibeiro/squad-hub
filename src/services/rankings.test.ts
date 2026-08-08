import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("./api", () => ({
  API_BASE_URL: "http://localhost:3333",
  TOKEN_KEY: "@montesquad:token",
  USER_KEY: "@montesquad:user",
  api: mocks,
}));

import {
  getProjectCommitters,
  getGlobalCommitters,
  getProjectContributors,
  getGlobalContributors,
} from "./rankings";

const COMMITTER = {
  userId: "12",
  name: "João Silva",
  githubLogin: "joaosilva",
  avatarUrl: "https://a",
  commitCount: 32,
};

const CONTRIBUTOR = {
  userId: "12",
  name: "João Silva",
  githubLogin: "joaosilva",
  avatarUrl: "https://a",
  score: 820,
  commitCount: 32,
  prsAbertos: 2,
  prsMergeados: 4,
  tasksVerificadas: 4,
};

describe("services/rankings.ts (ETAPAS 11-14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getProjectCommitters passa limit e desembrulha", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true, dados: [COMMITTER] } });
    const list = await getProjectCommitters(1, 5);
    expect(mocks.get).toHaveBeenCalledWith("/projetos/1/rankings/committers", {
      params: { limit: 5 },
    });
    expect(list[0].githubLogin).toBe("joaosilva");
  });

  it("getGlobalCommitters passa limit e period", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true, dados: [COMMITTER] } });
    const list = await getGlobalCommitters(10, "month");
    expect(mocks.get).toHaveBeenCalledWith("/rankings/committers", {
      params: { limit: 10, period: "month" },
    });
    expect(list).toHaveLength(1);
  });

  it("getProjectContributors retorna score", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true, dados: [CONTRIBUTOR] } });
    const list = await getProjectContributors(1, 10);
    expect(mocks.get).toHaveBeenCalledWith("/projetos/1/rankings/contributors", {
      params: { limit: 10 },
    });
    expect(list[0].score).toBe(820);
    expect(list[0].tasksVerificadas).toBe(4);
  });

  it("getGlobalContributors retorna score global", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: true, dados: [CONTRIBUTOR] } });
    const list = await getGlobalContributors(10, "all");
    expect(mocks.get).toHaveBeenCalledWith("/rankings/contributors", {
      params: { limit: 10, period: "all" },
    });
    expect(list[0].prsMergeados).toBe(4);
  });

  it("lança erro amigável quando sucesso=false", async () => {
    mocks.get.mockResolvedValue({ data: { sucesso: false, message: "Sem acesso", dados: null } });
    await expect(getProjectCommitters(1, 5)).rejects.toThrow("Sem acesso");
  });

  it("erro de rede vira erro amigável (axios)", async () => {
    mocks.get.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Backend offline" } },
    });
    await expect(getGlobalContributors(10)).rejects.toThrow("Backend offline");
  });
});
