import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Route as ProjetoRoute } from "@/routes/projetos.$id";
import type { ProjectDetail } from "@/services/projectDetail";

/**
 * ETAPA 20 (acessibilidade) da refatoração UI/UX — contrato de acessibilidade
 * da tela de projeto renderizada pela rota /projetos/:id.
 *
 * Cobre os itens da ETAPA 20 verificáveis em jsdom:
 *   1. Tabs do Radix navegáveis por teclado (roving tabindex + setas) e estado
 *      ativo perceptível sem depender apenas de cor (aria-selected/data-state +
 *      bg/shadow no CSS do TabsTrigger);
 *   2. aria-label no menu '...' do ProjectHeader ('Mais ações do projeto');
 *   3. Dialogs com DialogTitle + DialogDescription (candidatura, links/settings,
 *      Nova Vaga);
 *   4. Botões destrutivos identificados (Encerrar/Sair com text-destructive);
 *   5. Ícones sem texto com nome acessível (aria-label).
 *
 * ProjectHeader, ProjectSettings e Vagas são renderizados REAIS (são o foco da
 * ETAPA 20); os demais painéis de aba (Kanban, Mural, Membros, GitHub, Insights,
 * etc.) são stubs para manter o teste determinístico. Services são mockados.
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

// --- Estado de autenticação mutável (owner / membro / visitante) -------------

const authState = vi.hoisted(() => ({
  user: { id: "1", name: "Você", email: "voce@email.com", skills: [] as string[] },
  isAuthenticated: true,
  isLoading: false,
}));

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
  useAuth: () => authState,
}));

vi.mock("@/layouts/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Painéis pesados das abas são stubs — o foco da ETAPA 20 está no header,
// nos dialogs e nas tabs (ProjectHeader/ProjectSettings/Vagas reais).
vi.mock("@/components/projects/KanbanBoard", () => ({
  KanbanBoard: () => <div>KanbanBoard</div>,
}));
vi.mock("@/components/projects/Mural", () => ({
  Mural: () => <div>Mural</div>,
}));
vi.mock("@/components/projects/MembersList", () => ({
  MembersList: () => <div>MembersList</div>,
}));
vi.mock("@/components/projects/Applications", () => ({
  Applications: () => <div>Applications</div>,
}));
vi.mock("@/components/projects/GithubProjectPanel", () => ({
  GithubProjectPanel: () => <div>GithubProjectPanel</div>,
}));
vi.mock("@/components/projects/ProjectTimeline", () => ({
  ProjectTimeline: () => <div>ProjectTimeline</div>,
}));
vi.mock("@/components/projects/TasksRecomendadas", () => ({
  TasksRecomendadas: () => <div>TasksRecomendadas</div>,
}));
vi.mock("@/components/projects/TopContributors", () => ({
  TopContributors: () => <div>TopContributors</div>,
}));
vi.mock("@/components/projects/TopCommitters", () => ({
  TopCommitters: () => <div>TopCommitters</div>,
}));
vi.mock("@/components/projects/InsightsResumo", () => ({
  InsightsResumo: () => <div>InsightsResumo</div>,
}));

// --- Services mockados -------------------------------------------------------

const fetchProjectDetail = vi.fn();
const closeProjectLocal = vi.fn();
const atualizarVisibilidadeProjeto = vi.fn();
const atualizarLinksProjeto = vi.fn();
const sairDoProjeto = vi.fn();
const candidatarComVaga = vi.fn();

vi.mock("@/services/projectDetail", () => ({
  fetchProjectDetail: (...args: unknown[]) => fetchProjectDetail(...args),
  closeProjectLocal: (...args: unknown[]) => closeProjectLocal(...args),
  atualizarVisibilidadeProjeto: (...args: unknown[]) => atualizarVisibilidadeProjeto(...args),
  atualizarLinksProjeto: (...args: unknown[]) => atualizarLinksProjeto(...args),
}));

vi.mock("@/services/membros", () => ({
  sairDoProjeto: (...args: unknown[]) => sairDoProjeto(...args),
}));

vi.mock("@/services/candidaturas", () => ({
  candidatarComVaga: (...args: unknown[]) => candidatarComVaga(...args),
}));

vi.mock("@/services/notificationsIntegration", () => ({
  notificationsIntegration: {
    notifyApplied: vi.fn(),
    notifyApplicationStatus: vi.fn(),
  },
}));

vi.mock("@/services/perfilTecnico", () => ({
  getFuncoes: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/vagas", () => ({
  criarVaga: vi.fn(),
  atualizarVaga: vi.fn(),
  excluirVaga: vi.fn(),
}));

// --- Dados -------------------------------------------------------------------

function makeData(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "1",
    name: "Projeto Teste",
    description: "Descrição do projeto",
    status: "Aberto",
    technologies: ["React"],
    membersCount: 2,
    membersLimit: 5,
    createdBy: "Você",
    createdAt: "2026-01-01T00:00:00.000Z",
    longDescription: "Descrição longa do projeto",
    tasks: [],
    messages: [],
    members: [
      { id: "1", name: "Você", role: "Owner", skills: ["React"] },
      { id: "2", name: "Ana Souza", role: "Membro", skills: ["Node.js"] },
    ],
    applications: [],
    vagas: [],
    visibilidade: "publico",
    permitirPortfolioPublico: true,
    creatorId: "1",
    ...overrides,
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

describe("ETAPA 20 — acessibilidade da tela de projeto", () => {
  it("tabs navegáveis por teclado: roving tabindex e setas trocam a aba", async () => {
    const user = userEvent.setup();
    authState.user = { id: "1", name: "Você", email: "voce@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Kanban",
      "Atividade",
      "Equipe",
      "GitHub",
      "Insights",
      "Configurações",
    ]);

    const kanban = screen.getByRole("tab", { name: "Kanban" });
    const atividade = screen.getByRole("tab", { name: "Atividade" });

    // Roving tabindex (RovingFocusGroup do Radix): o tablist é o tab stop
    // (Tab chega nas tabs); os triggers ficam com tabindex -1 até serem
    // focados — o trigger ativo vira o tab stop corrente.
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("tabindex", "0");
    expect(kanban).toHaveAttribute("tabindex", "-1");
    expect(atividade).toHaveAttribute("tabindex", "-1");
    expect(kanban).toHaveAttribute("aria-selected", "true");
    expect(atividade).toHaveAttribute("aria-selected", "false");

    // Estado ativo perceptível sem depender apenas de cor: o Radix marca
    // data-state=active e o TabsTrigger aplica bg + shadow + text-foreground.
    expect(kanban).toHaveAttribute("data-state", "active");
    expect(atividade).toHaveAttribute("data-state", "inactive");
    expect(kanban.className).toMatch(/data-\[state=active\]:bg-background/);
    expect(kanban.className).toMatch(/data-\[state=active\]:shadow/);

    // Focus visible: o TabsTrigger declara anel de foco (ring) no teclado.
    expect(kanban.className).toMatch(/focus-visible:ring-2/);

    // Foco na aba ativa (clique) → ela vira o tab stop corrente.
    await user.click(kanban);
    expect(kanban).toHaveAttribute("tabindex", "0");

    // Seta direita a partir da aba ativa → Atividade selecionada e focada.
    await user.keyboard("{ArrowRight}");
    expect(atividade).toHaveAttribute("aria-selected", "true");
    expect(atividade).toHaveAttribute("tabindex", "0");
    expect(kanban).toHaveAttribute("aria-selected", "false");
    expect(kanban).toHaveAttribute("tabindex", "-1");

    // Seta esquerda volta para Kanban.
    await user.keyboard("{ArrowLeft}");
    expect(kanban).toHaveAttribute("aria-selected", "true");
    expect(kanban).toHaveAttribute("tabindex", "0");
  });

  it("menu '...' do ProjectHeader tem aria-label e expõe as ações administrativas", async () => {
    const user = userEvent.setup();
    authState.user = { id: "1", name: "Você", email: "voce@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    const menu = screen.getByRole("button", { name: "Mais ações do projeto" });
    expect(menu).toHaveAccessibleName("Mais ações do projeto");
    // Botão só-ícone: sem texto visível, o nome vem do aria-label.
    expect(menu.textContent?.trim()).toBe("");

    await user.click(menu);
    expect(screen.getByRole("menuitem", { name: "Privacidade" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Gerenciar links" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Configurar GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Encerrar projeto" })).toBeInTheDocument();
  });

  it("dialog de candidatura tem título e descrição acessíveis (visitante)", async () => {
    const user = userEvent.setup();
    authState.user = { id: "3", name: "Visitante", email: "visitante@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    await user.click(screen.getByRole("button", { name: "Candidatar-se ao Squad" }));

    const dialog = screen.getByRole("dialog", { name: "Candidatura para o Squad" });
    expect(dialog).toHaveAccessibleName("Candidatura para o Squad");
    expect(dialog).toHaveAccessibleDescription(/por que você gostaria de participar/i);
    // Botão de fechar (X) também tem nome acessível.
    expect(screen.getByRole("button", { name: /close|fechar/i })).toBeInTheDocument();
  });

  it("dialog de links (settings) tem título e descrição acessíveis (owner)", async () => {
    const user = userEvent.setup();
    authState.user = { id: "1", name: "Você", email: "voce@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    // ProjectSettings agora vive na tab Configurações (ETAPA 2 Kanban escalável).
    await user.click(screen.getByRole("tab", { name: "Configurações" }));
    await user.click(screen.getByRole("button", { name: /editar links/i }));

    const dialog = screen.getByRole("dialog", { name: "Links de trabalho do squad" });
    expect(dialog).toHaveAccessibleName("Links de trabalho do squad");
    expect(dialog).toHaveAccessibleDescription(/Deixe vazio para remover/i);
  });

  it("dialog de Nova Vaga tem título e descrição acessíveis (owner)", async () => {
    const user = userEvent.setup();
    authState.user = { id: "1", name: "Você", email: "voce@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    await user.click(screen.getByRole("tab", { name: "Equipe" }));
    await user.click(screen.getByRole("tab", { name: "Vagas" }));
    await user.click(screen.getByRole("button", { name: "Nova Vaga" }));

    const dialog = screen.getByRole("dialog", { name: "Nova Vaga" });
    expect(dialog).toHaveAccessibleName("Nova Vaga");
    expect(dialog).toHaveAccessibleDescription(/Defina qual perfil o projeto está procurando/i);
  });

  it("botões destrutivos identificados: Encerrar Projeto (owner)", async () => {
    const user = userEvent.setup();
    authState.user = { id: "1", name: "Você", email: "voce@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    // Seção Encerrar (ProjectSettings) agora vive na tab Configurações.
    await user.click(screen.getByRole("tab", { name: "Configurações" }));
    const encerrar = screen.getByRole("button", { name: "Encerrar Projeto" });
    expect(encerrar).toHaveClass("text-destructive");
    expect(encerrar).not.toBeDisabled();

    // Item do menu '...' também é destrutivo.
    await user.click(screen.getByRole("button", { name: "Mais ações do projeto" }));
    expect(screen.getByRole("menuitem", { name: "Encerrar projeto" })).toHaveClass(
      "text-destructive",
    );
  });

  it("membro vê 'Sair do projeto' como item destrutivo no menu '...'", async () => {
    const user = userEvent.setup();
    authState.user = { id: "2", name: "Ana Souza", email: "ana@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    await user.click(screen.getByRole("button", { name: "Mais ações do projeto" }));
    const sair = screen.getByRole("menuitem", { name: "Sair do projeto" });
    expect(sair).toHaveClass("text-destructive");
  });

  it("ícones sem texto têm nome acessível (aria-label)", async () => {
    authState.user = { id: "1", name: "Você", email: "voce@email.com", skills: [] };
    fetchProjectDetail.mockResolvedValue(makeData());

    renderRota();
    await screen.findByText("KanbanBoard");

    // Todo botão sem texto visível precisa de nome acessível (aria-label).
    const botoes = screen.getAllByRole("button");
    const semTexto = botoes.filter((b) => !(b.textContent ?? "").trim());
    expect(semTexto.length).toBeGreaterThan(0);
    for (const botao of semTexto) {
      expect(botao).toHaveAccessibleName();
    }

    // Caso concreto: o botão do menu '...' é ícone-only com aria-label.
    expect(screen.getByRole("button", { name: "Mais ações do projeto" })).toBeInTheDocument();
  });
});
