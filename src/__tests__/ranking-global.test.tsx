import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Route } from "@/routes/ranking";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component?: React.ComponentType }) => ({
    options: { component: options?.component },
    useSearch: () => ({ tab: "contributors" }),
  }),
  useNavigate: () => vi.fn(),
  useSearch: () => ({ tab: "contributors" }),
}));
vi.mock("@/layouts/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/services/rankings", () => ({
  getGlobalContributors: vi.fn().mockResolvedValue([
    {
      userId: "1",
      name: "Lucas Mendes",
      githubLogin: "lucas-dev",
      avatarUrl: null,
      score: 120,
      commitCount: 40,
      prsAbertos: 2,
      prsMergeados: 5,
      tasksVerificadas: 3,
    },
    {
      userId: "2",
      name: "Roberto Almeida",
      githubLogin: "roberto-dev",
      avatarUrl: null,
      score: 90,
      commitCount: 30,
      prsAbertos: 1,
      prsMergeados: 3,
      tasksVerificadas: 2,
    },
  ]),
  getGlobalCommitters: vi.fn().mockResolvedValue([
    {
      userId: "1",
      name: "Lucas Mendes",
      githubLogin: "lucas-dev",
      avatarUrl: null,
      commitCount: 40,
    },
    {
      userId: "3",
      name: "Fernanda Souza",
      githubLogin: "fe-souza",
      avatarUrl: null,
      commitCount: 25,
    },
  ]),
}));

afterEach(() => {
  cleanup();
});

function renderRanking() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Component = Route.options.component!;
  return render(
    <QueryClientProvider client={qc}>
      <Component />
    </QueryClientProvider>,
  );
}

describe("ETAPA 19 — Ranking global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza titulo e tabs", async () => {
    renderRanking();
    expect(await screen.findByText("Ranking global")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /top contributors/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /top committers/i })).toBeInTheDocument();
  });

  it("mostra contributors com score", async () => {
    renderRanking();
    expect(await screen.findByText("Lucas Mendes")).toBeInTheDocument();
    expect(screen.getByText("Roberto Almeida")).toBeInTheDocument();
    // Scores visíveis
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
  });

  it("alterna para committers", async () => {
    const user = userEvent.setup();
    renderRanking();
    await screen.findByText("Lucas Mendes");
    await user.click(screen.getByRole("tab", { name: /top committers/i }));
    expect(await screen.findByText("Fernanda Souza")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });
});
