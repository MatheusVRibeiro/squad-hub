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
  getProjectGithubStatus,
  getInstallationRepositories,
  connectProjectRepository,
  disconnectProjectRepository,
  getUserGithubStatus,
  getGithubConnectUrl,
  disconnectGithubAccount,
  getTaskGithubStatus,
  getTaskCommits,
  getTaskTimeline,
} from "./github";

describe("services/github.ts (ETAPAS 5/6/8/15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getProjectGithubStatus desembrulha envelope e retorna status", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          conectado: true,
          github_repository_id: 100,
          github_repository_full_name: "empresa/repo",
          github_installation_id: 5,
          github_default_branch: "main",
          github_connected_at: "2026-08-08T00:00:00Z",
          repositorio_url: "https://github.com/empresa/repo",
        },
      },
    });
    const status = await getProjectGithubStatus(1);
    expect(mocks.get).toHaveBeenCalledWith("/projetos/1/github/status");
    expect(status.conectado).toBe(true);
    expect(status.github_repository_full_name).toBe("empresa/repo");
  });

  it("getProjectGithubStatus lança erro amigável quando sucesso=false", async () => {
    mocks.get.mockResolvedValue({
      data: { sucesso: false, message: "Projeto não encontrado", dados: null },
    });
    await expect(getProjectGithubStatus(999)).rejects.toThrow("Projeto não encontrado");
  });

  it("getInstallationRepositories retorna lista de repos", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 1,
            full_name: "a/b",
            html_url: "https://x",
            default_branch: "main",
            private: false,
          },
        ],
      },
    });
    const repos = await getInstallationRepositories(5);
    expect(mocks.get).toHaveBeenCalledWith("/github/installations/5/repositories");
    expect(repos).toHaveLength(1);
  });

  it("connectProjectRepository faz POST e devolve dados", async () => {
    mocks.post.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          conectado: true,
          github_repository_id: 100,
          github_repository_full_name: "empresa/repo",
          github_installation_id: 5,
          github_default_branch: "main",
          github_connected_at: null,
          repositorio_url: null,
        },
      },
    });
    const res = await connectProjectRepository(1, { installationId: 5, repositoryId: 100 });
    expect(mocks.post).toHaveBeenCalledWith("/projetos/1/github/repository", {
      installationId: 5,
      repositoryId: 100,
    });
    expect(res.conectado).toBe(true);
  });

  it("disconnectProjectRepository faz DELETE", async () => {
    mocks.delete.mockResolvedValue({ data: { sucesso: true, dados: null } });
    await disconnectProjectRepository(1);
    expect(mocks.delete).toHaveBeenCalledWith("/projetos/1/github/repository");
  });

  it("getUserGithubStatus (ETAPA 6) desembrulha identidade", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          conectado: false,
          github_user_id: null,
          github_login: null,
          github_avatar_url: null,
          github_connected_at: null,
        },
      },
    });
    const status = await getUserGithubStatus();
    expect(mocks.get).toHaveBeenCalledWith("/github/me");
    expect(status.conectado).toBe(false);
  });

  it("getGithubConnectUrl (ETAPA 6) retorna URL OAuth", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          url: "https://github.com/login/oauth/authorize?client_id=x&state=abc",
          state: "abc",
        },
      },
    });
    const { url, state } = await getGithubConnectUrl();
    expect(url).toContain("github.com/login/oauth/authorize");
    expect(state).toBe("abc");
  });

  it("disconnectGithubAccount (ETAPA 6) faz DELETE", async () => {
    mocks.delete.mockResolvedValue({ data: { sucesso: true, dados: null } });
    await disconnectGithubAccount();
    expect(mocks.delete).toHaveBeenCalledWith("/github/disconnect");
  });

  it("getTaskGithubStatus (ETAPA 8) retorna status da task", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: {
          github_branch: "task/38-criar",
          github_pr_number: 52,
          github_pr_url: "https://pr",
          github_pr_status: "open",
          github_last_activity_at: null,
          completion_source: null,
          completed_at: null,
        },
      },
    });
    const status = await getTaskGithubStatus(1, 38);
    expect(mocks.get).toHaveBeenCalledWith("/projetos/1/tarefas/38/github");
    expect(status.github_branch).toBe("task/38-criar");
  });

  it("getTaskCommits (ETAPA 8) retorna commits", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            sha: "abc123",
            sha_curto: "abc1234",
            mensagem: "feat: x",
            autor: "Matheus",
            login: null,
            email: null,
            url: null,
            commit_em: null,
            branch: "task/38",
          },
        ],
      },
    });
    const commits = await getTaskCommits(1, 38);
    expect(mocks.get).toHaveBeenCalledWith("/projetos/1/tarefas/38/commits");
    expect(commits[0].sha_curto).toBe("abc1234");
  });

  it("getTaskTimeline (ETAPA 15) retorna eventos ordenados", async () => {
    mocks.get.mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            tipo: "assumida",
            titulo: "Tarefa assumida",
            detalhe: "Lucas",
            quando: "2026-08-08T09:02:00Z",
          },
          {
            tipo: "pr_merged",
            titulo: "PR #52 mergeado",
            detalhe: "Contribuição verificada",
            url: "https://pr",
            quando: "2026-08-08T12:25:00Z",
          },
        ],
      },
    });
    const eventos = await getTaskTimeline(1, 38);
    expect(mocks.get).toHaveBeenCalledWith("/projetos/1/tarefas/38/timeline");
    expect(eventos[0].tipo).toBe("assumida");
    expect(eventos[1].tipo).toBe("pr_merged");
  });
});
