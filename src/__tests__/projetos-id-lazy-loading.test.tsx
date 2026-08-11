import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Route as ProjetoRoute } from "@/routes/projetos.$id";
import type { ProjectDetail } from "@/services/projectDetail";

/**
 * ETAPA 19 (performance) da refatoração UI/UX — lazy loading das abas
 * secundárias.
 *
 * A rota usa Tabs do Radix (sem forceMount): o TabsContent da aba INATIVA é
 * desmontado, então os componentes de aba secundária (ProjectTimeline,
 * GithubProjectPanel, TopContributors, TopCommitters) só MOUNTAM — e só
 * disparam suas queries próprias — quando a aba é aberta. Este teste trava
 * essa garantia:
 *
 *   1. Ao montar a rota, APENAS a query principal useQuery(["project", id])
 *      (fetchProjectDetail) + a do Kanban (fetchTasksRecomendadas, aba padrão)
 *      são chamadas — nenhuma query secundária.
 *   2. Abrir "Atividade" dispara fetchEventosProjeto.
 *   3. Abrir "GitHub" dispara getProjectGithubStatus.
 *   4. Abrir "Insights" dispara getProjectContributors + getProjectCommitters.
 *   5. Nenhuma chamada duplicada (cada query secundária exatamente 1x).
 *
 * As queries secundárias são testadas com os componentes REAIS (apenas os
 * services são mockados) — é o mount condicional do Radix que está em teste,
 * não a lógica dos cards.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

afterEach(cleanup);

// --- Mocks de módulo ---------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component?: React.ComponentType }) => ({
    options: { component: options?.component },
  }),
  Link: ({ children, ...rest }: { children: React.ReactNode; to?: string }) => (
    <a {...rest}>{children}</a>
  ),
  useParams: () => ({ id: "1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Você", email: "voce@email.com" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Layout/roteamento/painéis pesados são stubs — o teste foca no mount
// condicional das abas e nas queries secundárias REAIS.
vi.mock("@/layouts/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/projects/ProjectHeader", () => ({
  ProjectHeader: () => <div>ProjectHeader</div>,
}));

vi.mock("@/components/projects/ProjectSettings", () => ({
  ProjectSettings: () => <div>ProjectSettings</div>,
}));

// KanbanBoard (drag-and-drop + framer-motion) é stub: o que importa é que a
// aba padrão monta (fetchProjectDetail) e as abas secundárias NÃO.
vi.mock("@/components/projects/KanbanBoard", () => ({
  KanbanBoard: () => <div>KanbanBoard</div>,
}));

vi.mock("@/components/projects/Mural", () => ({
  Mural: () => <div>Mural</div>,
}));

vi.mock("@/components/projects/MembersList", () => ({
  MembersList: () => <div>MembersList</div>,
}));

vi.mock("@/components/projects/Vagas", () => ({
  Vagas: () => <div>Vagas</div>,
}));

vi.mock("@/components/projects/Applications", () => ({
  Applications: () => <div>Applications</div>,
}));

// --- Services mockados (as queries secundárias reais consomem estes) ---------

const fetchProjectDetail = vi.fn();
const fetchTasksRecomendadas = vi.fn();
const fetchEventosProjeto = vi.fn();
const getProjectGithubStatus = vi.fn();
const getProjectContributors = vi.fn();
const getProjectCommitters = vi.fn();
const sairDoProjeto = vi.fn();

vi.mock("@/services/projectDetail", () => ({
  fetchProjectDetail: (...args: unknown[]) => fetchProjectDetail(...args),
  closeProjectLocal: vi.fn(),
  atualizarVisibilidadeProjeto: vi.fn(),
  atualizarLinksProjeto: vi.fn(),
}));

vi.mock("@/services/taskMatching", () => ({
  fetchTasksRecomendadas: (...args: unknown[]) => fetchTasksRecomendadas(...args),
}));

vi.mock("@/services/eventos", () => ({
  fetchEventosProjeto: (...args: unknown[]) => fetchEventosProjeto(...args),
}));

vi.mock("@/services/github", () => ({
  getProjectGithubStatus: (...args: unknown[]) => getProjectGithubStatus(...args),
  getInstallationRepositories: vi.fn().mockResolvedValue([]),
  connectProjectRepository: vi.fn(),
  disconnectProjectRepository: vi.fn(),
}));

vi.mock("@/services/rankings", () => ({
  getProjectContributors: (...args: unknown[]) => getProjectContributors(...args),
  getGlobalContributors: vi.fn(),
  getProjectCommitters: (...args: unknown[]) => getProjectCommitters(...args),
  getGlobalCommitters: vi.fn(),
}));

vi.mock("@/services/membros", () => ({
  sairDoProjeto: (...args: unknown[]) => sairDoProjeto(...args),
}));

// --- Dados ---------------------------------------------------------------

function makeData(): ProjectDetail {
  return {
    id: "1",
    name: "Projeto Teste",
    description: "Descrição do projeto",
    status: "Aberto",
    technologies: ["React"],
    membersCount: 1,
    membersLimit: 5,
    createdBy: "Você",
    createdAt: "2026-01-01T00:00:00.000Z",
    longDescription: "Descrição longa do projeto",
    tasks: [],
    messages: [],
    members: [],
    applications: [],
    vagas: [],
    visibilidade: "publico",
    permitirPortfolioPublico: true,
    creatorId: "1",
  };
}

function renderRota() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Component = ProjetoRoute.options.component!;
  const view = render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

describe("ETAPA 19 — lazy loading das abas secundárias", () => {
  it("monta apenas Projeto+Kanban: query principal chamada, nenhuma query secundária", async () => {
    fetchProjectDetail.mockResolvedValue(makeData());
    fetchTasksRecomendadas.mockResolvedValue([]);

    renderRota();

    // Kanban (aba padrão) renderiza imediatamente.
    expect(await screen.findByText("KanbanBoard")).toBeInTheDocument();

    // Query principal preservada (useQuery(["project", id])) — 1 chamada.
    expect(fetchProjectDetail).toHaveBeenCalledTimes(1);
    expect(fetchProjectDetail).toHaveBeenCalledWith("1");

    // Prioridade Projeto+Kanban: a recomendação da aba padrão carrega junto.
    await waitFor(() => expect(fetchTasksRecomendadas).toHaveBeenCalledTimes(1));

    // Nenhuma query secundária foi disparada no load.
    expect(fetchEventosProjeto).not.toHaveBeenCalled();
    expect(getProjectGithubStatus).not.toHaveBeenCalled();
    expect(getProjectContributors).not.toHaveBeenCalled();
    expect(getProjectCommitters).not.toHaveBeenCalled();
  });

  it("Atividade: timeline dispara fetchEventosProjeto só quando a aba abre", async () => {
    fetchProjectDetail.mockResolvedValue(makeData());
    fetchEventosProjeto.mockResolvedValue([]);

    renderRota();
    await screen.findByText("KanbanBoard");

    expect(fetchEventosProjeto).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("tab", { name: "Atividade" }));
    await waitFor(() => expect(fetchEventosProjeto).toHaveBeenCalledTimes(1));
    expect(fetchEventosProjeto).toHaveBeenCalledWith("1");

    // Nenhuma outra query secundária foi disparada.
    expect(getProjectGithubStatus).not.toHaveBeenCalled();
    expect(getProjectContributors).not.toHaveBeenCalled();
    expect(getProjectCommitters).not.toHaveBeenCalled();
  });

  it("GitHub: status dispara getProjectGithubStatus só quando a aba abre", async () => {
    fetchProjectDetail.mockResolvedValue(makeData());
    getProjectGithubStatus.mockResolvedValue({ conectado: false });

    renderRota();
    await screen.findByText("KanbanBoard");

    expect(getProjectGithubStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("tab", { name: "GitHub" }));
    await waitFor(() => expect(getProjectGithubStatus).toHaveBeenCalledTimes(1));
    expect(getProjectGithubStatus).toHaveBeenCalledWith("1");

    expect(fetchEventosProjeto).not.toHaveBeenCalled();
    expect(getProjectContributors).not.toHaveBeenCalled();
    expect(getProjectCommitters).not.toHaveBeenCalled();
  });

  it("Insights: rankings disparam só quando a aba abre (e sem duplicar)", async () => {
    fetchProjectDetail.mockResolvedValue(makeData());
    getProjectContributors.mockResolvedValue([]);
    getProjectCommitters.mockResolvedValue([]);

    renderRota();
    await screen.findByText("KanbanBoard");

    expect(getProjectContributors).not.toHaveBeenCalled();
    expect(getProjectCommitters).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));

    await waitFor(() => expect(getProjectContributors).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getProjectCommitters).toHaveBeenCalledTimes(1));
    expect(getProjectContributors).toHaveBeenCalledWith("1", 5);
    expect(getProjectCommitters).toHaveBeenCalledWith("1", 5);

    // Sem chamadas duplicadas na primeira abertura: cada query secundária 1x.
    expect(fetchEventosProjeto).not.toHaveBeenCalled();
    expect(getProjectGithubStatus).not.toHaveBeenCalled();
  });
});
