import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { Route as ProjetoRoute } from "@/routes/projetos.$id";
import type { ProjectDetail } from "@/services/projectDetail";

/**
 * ETAPA 21 (testes funcionais por papel) da refatoração UI/UX — a tela de
 * projeto renderizada pela rota /projetos/:id se comporta diferente para
 * owner, membro e visitante.
 *
 * Cobre os itens da ETAPA 21 verificáveis em jsdom:
 *   OWNER — Kanban é a aba padrão, ações admin no menu '...' (Privacidade,
 *     Gerenciar links, Configurar GitHub, Encerrar projeto), aba Candidaturas
 *     com badge de pendentes, Nova Vaga, privacidade
 *     (atualizarVisibilidadeProjeto), encerrar projeto (closeProjectLocal).
 *   MEMBRO — Kanban editável, Timeline na Atividade, GitHub permitido
 *     (isOwner=false), links de trabalho, Sair do projeto (sairDoProjeto) e
 *     NENHUMA ação de owner (menu sem Privacidade/links/GitHub/Encerrar, sem
 *     Convidar, sem Nova Vaga, sem Candidaturas, sem ProjectSettings).
 *   VISITANTE — informações públicas carregam, banner de candidatura, Kanban
 *     readOnly, sem Timeline, vagas públicas sem ações admin, candidatura
 *     (candidatarComVaga) e NENHUMA ação administrativa.
 *
 * ProjectHeader, ProjectSettings, Vagas, MembersList, Applications e
 * ApplicationForm são renderizados REAIS (são o foco da ETAPA 21); os painéis
 * pesados (KanbanBoard, Mural, GitHub, Timeline, Insights, Recomendadas) são
 * stubs que expõem as props de permissão (readOnly/isOwner) para o teste.
 * Services são mockados.
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

const ROLES = {
  owner: { id: "1", name: "Você", email: "voce@email.com" },
  member: { id: "2", name: "Ana Souza", email: "ana@email.com" },
  visitor: { id: "3", name: "Visitante", email: "visitante@email.com" },
} as const;

function setRole(role: keyof typeof ROLES) {
  authState.user = { ...ROLES[role], skills: [] };
}

// --- Mocks de módulo ---------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component?: React.ComponentType }) => ({
    options: { component: options?.component },
  }),
  Link: ({ children, ...rest }: { children: ReactNode; to?: string }) => (
    <a {...rest}>{children}</a>
  ),
  useParams: () => ({ id: "1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/layouts/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Painéis pesados das abas são stubs que expõem as props de permissão — o
// foco da ETAPA 21 está no roteamento por papel (o que cada papel vê/pode).
vi.mock("@/components/projects/KanbanBoard", () => ({
  KanbanBoard: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="kanban-board" data-readonly={String(readOnly)}>
      KanbanBoard
    </div>
  ),
}));

vi.mock("@/components/projects/Mural", () => ({
  Mural: () => <div>Mural</div>,
}));

vi.mock("@/components/projects/GithubProjectPanel", () => ({
  GithubProjectPanel: ({ isOwner }: { isOwner?: boolean }) => (
    <div data-testid="github-panel" data-isowner={String(isOwner)}>
      GithubProjectPanel
    </div>
  ),
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
const updateLocalApplicationStatus = vi.fn();
const sairDoProjeto = vi.fn();
const candidatarComVaga = vi.fn();

vi.mock("@/services/projectDetail", () => ({
  fetchProjectDetail: (...args: unknown[]) => fetchProjectDetail(...args),
  closeProjectLocal: (...args: unknown[]) => closeProjectLocal(...args),
  atualizarVisibilidadeProjeto: (...args: unknown[]) => atualizarVisibilidadeProjeto(...args),
  atualizarLinksProjeto: (...args: unknown[]) => atualizarLinksProjeto(...args),
  updateLocalApplicationStatus: (...args: unknown[]) => updateLocalApplicationStatus(...args),
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
    technologies: ["React", "Node.js"],
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
    applications: [
      {
        id: "a1",
        userId: "9",
        name: "Diego Rocha",
        message: "Tenho experiência com Node e gostaria de contribuir no backend.",
        skills: ["Node.js"],
        createdAt: "2026-01-02T00:00:00.000Z",
        status: "pending",
        vaga_id: null,
        vaga_nome: null,
      },
    ],
    vagas: [
      {
        id: "v1",
        projeto_id: "1",
        funcao_id: 2,
        funcao_nome: "Frontend",
        quantidade: 2,
        preenchidas: 0,
        descricao: "Buscamos alguém para o frontend do squad.",
        nivel_desejado: "intermediario",
        status: "aberta",
      },
    ],
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

describe("ETAPA 21 — testes funcionais por papel", () => {
  describe("Owner", () => {
    it("abre o projeto com o Kanban como aba padrão e quadro editável", async () => {
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();

      const kanbanTab = await screen.findByRole("tab", { name: "Kanban" });
      expect(kanbanTab).toHaveAttribute("aria-selected", "true");

      // Owner também é membro: quadro editável + tarefas recomendadas.
      expect(screen.getByTestId("kanban-board")).toHaveAttribute("data-readonly", "false");
      expect(screen.getByText("TasksRecomendadas")).toBeInTheDocument();
    });

    it("menu '...' expõe as ações administrativas e não mostra Sair do projeto", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("button", { name: "Mais ações do projeto" }));

      expect(screen.getByRole("menuitem", { name: "Privacidade" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Gerenciar links" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Configurar GitHub" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Encerrar projeto" })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Sair do projeto" })).not.toBeInTheDocument();
    });

    it("Nova tarefa (header) mantém o Kanban ativo", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("button", { name: /nova tarefa/i }));
      expect(screen.getByRole("tab", { name: "Kanban" })).toHaveAttribute("aria-selected", "true");
    });

    it("Equipe: membros listados e Vagas com Nova Vaga", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Equipe" }));

      // MembersList real: membros + badge Owner.
      expect(screen.getByText("Ana Souza")).toBeInTheDocument();
      expect(screen.getByText("Owner")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Vagas" }));
      expect(screen.getByRole("button", { name: "Nova Vaga" })).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
    });

    it("Candidaturas: aba visível só para o owner, com badge de pendentes", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Equipe" }));

      const candidaturas = screen.getByRole("tab", { name: /candidaturas/i });
      expect(candidaturas).toHaveTextContent("1"); // badge de pendentes

      await user.click(candidaturas);
      expect(screen.getByText("Diego Rocha")).toBeInTheDocument();
    });

    it("GitHub: painel abre com isOwner=true", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "GitHub" }));
      expect(screen.getByTestId("github-panel")).toHaveAttribute("data-isowner", "true");
    });

    it("Insights: resumo e rankings abrem", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Insights" }));
      expect(screen.getByText("InsightsResumo")).toBeInTheDocument();
    });

    it("privacidade: alterar visibilidade chama atualizarVisibilidadeProjeto", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("combobox", { name: "Visibilidade" }));
      await user.click(screen.getByRole("option", { name: "Privado" }));

      await waitFor(() =>
        expect(atualizarVisibilidadeProjeto).toHaveBeenCalledWith("1", {
          visibilidade: "privado",
        }),
      );
    });

    it("links de trabalho do squad aparecem para o owner", async () => {
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(
        makeData({
          repositorioUrl: "https://github.com/squad/projeto",
          figmaUrl: "https://figma.com/file/projeto",
          discordUrl: "https://discord.gg/squad",
          documentacaoUrl: "https://docs.example.com/projeto",
        }),
      );

      renderRota();
      await screen.findByTestId("kanban-board");

      expect(
        screen.getByRole("link", { name: "Abrir repositório do projeto no GitHub" }),
      ).toHaveAttribute("href", "https://github.com/squad/projeto");
      expect(
        screen.getByRole("link", { name: "Abrir protótipo do projeto no Figma" }),
      ).toHaveAttribute("href", "https://figma.com/file/projeto");
      expect(
        screen.getByRole("link", { name: "Entrar no canal de comunicação do squad" }),
      ).toHaveAttribute("href", "https://discord.gg/squad");
      expect(screen.getByRole("link", { name: "Abrir documentação do projeto" })).toHaveAttribute(
        "href",
        "https://docs.example.com/projeto",
      );
    });

    it("encerrar projeto: confirmação chama closeProjectLocal", async () => {
      const user = userEvent.setup();
      setRole("owner");
      fetchProjectDetail.mockResolvedValue(makeData());
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("button", { name: "Mais ações do projeto" }));
      await user.click(screen.getByRole("menuitem", { name: "Encerrar projeto" }));

      await waitFor(() => expect(closeProjectLocal).toHaveBeenCalledWith("1"));
    });
  });

  describe("Membro", () => {
    it("abre o projeto com Kanban editável e tarefas recomendadas", async () => {
      setRole("member");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();

      const kanbanTab = await screen.findByRole("tab", { name: "Kanban" });
      expect(kanbanTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("kanban-board")).toHaveAttribute("data-readonly", "false");
      expect(screen.getByText("TasksRecomendadas")).toBeInTheDocument();
    });

    it("atividade: Timeline disponível para o membro", async () => {
      const user = userEvent.setup();
      setRole("member");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Atividade" }));
      await user.click(screen.getByRole("tab", { name: "Timeline" }));
      expect(screen.getByText("ProjectTimeline")).toBeInTheDocument();
    });

    it("equipe: membros e vagas visíveis, sem aba Candidaturas", async () => {
      const user = userEvent.setup();
      setRole("member");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Equipe" }));
      expect(screen.getByText("Ana Souza")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Vagas" }));
      expect(screen.getByText("Frontend")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Nova Vaga" })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /candidaturas/i })).not.toBeInTheDocument();
    });

    it("GitHub permitido: painel abre com isOwner=false", async () => {
      const user = userEvent.setup();
      setRole("member");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "GitHub" }));
      expect(screen.getByTestId("github-panel")).toHaveAttribute("data-isowner", "false");
    });

    it("links de trabalho do squad aparecem para o membro", async () => {
      setRole("member");
      fetchProjectDetail.mockResolvedValue(
        makeData({
          repositorioUrl: "https://github.com/squad/projeto",
          figmaUrl: "https://figma.com/file/projeto",
        }),
      );

      renderRota();
      await screen.findByTestId("kanban-board");

      expect(
        screen.getByRole("link", { name: "Abrir repositório do projeto no GitHub" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Abrir protótipo do projeto no Figma" }),
      ).toBeInTheDocument();
    });

    it("sair do projeto: confirmação chama sairDoProjeto", async () => {
      const user = userEvent.setup();
      setRole("member");
      fetchProjectDetail.mockResolvedValue(makeData());
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("button", { name: "Mais ações do projeto" }));
      await user.click(screen.getByRole("menuitem", { name: "Sair do projeto" }));

      await waitFor(() => expect(sairDoProjeto).toHaveBeenCalledWith("1"));
    });

    it("ações de owner NÃO aparecem para o membro", async () => {
      const user = userEvent.setup();
      setRole("member");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      // Menu '...' só com Sair do projeto — nenhuma ação administrativa.
      await user.click(screen.getByRole("button", { name: "Mais ações do projeto" }));
      expect(screen.getByRole("menuitem", { name: "Sair do projeto" })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Privacidade" })).not.toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Gerenciar links" })).not.toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Configurar GitHub" })).not.toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: "Encerrar projeto" })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");

      // Sem botões de owner no header e sem configurações do dono.
      expect(screen.queryByRole("button", { name: /convidar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Nova Vaga" })).not.toBeInTheDocument();
      expect(screen.queryByText("Configurações do projeto")).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /candidaturas/i })).not.toBeInTheDocument();
    });
  });

  describe("Visitante", () => {
    it("informações públicas carregam", async () => {
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();

      expect(await screen.findByRole("heading", { name: "Projeto Teste" })).toBeInTheDocument();
      expect(screen.getByText("Descrição longa do projeto")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
    });

    it("banner de visitante e Candidatar-se ao Squad visíveis", async () => {
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      expect(screen.getByText(/visualizando este projeto como visitante/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Candidatar-se ao Squad" })).toBeInTheDocument();
    });

    it("informações privadas NÃO aparecem para o visitante", async () => {
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(
        makeData({
          repositorioUrl: "https://github.com/squad/projeto",
          figmaUrl: "https://figma.com/file/projeto",
        }),
      );

      renderRota();
      await screen.findByTestId("kanban-board");

      // Links de trabalho são privados (só membros).
      expect(
        screen.queryByRole("link", { name: "Abrir repositório do projeto no GitHub" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Abrir protótipo do projeto no Figma" }),
      ).not.toBeInTheDocument();
      // Sem menu '...' e sem configurações do dono.
      expect(
        screen.queryByRole("button", { name: "Mais ações do projeto" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Configurações do projeto")).not.toBeInTheDocument();
      // Sem ações frequentes de membro/dono.
      expect(screen.queryByRole("button", { name: /nova tarefa/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /convidar/i })).not.toBeInTheDocument();
    });

    it("Kanban em modo somente leitura e sem tarefas recomendadas", async () => {
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();

      expect(await screen.findByTestId("kanban-board")).toHaveAttribute("data-readonly", "true");
      expect(screen.queryByText("TasksRecomendadas")).not.toBeInTheDocument();
    });

    it("atividade: sem Timeline, apenas Mural", async () => {
      const user = userEvent.setup();
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Atividade" }));
      expect(screen.queryByRole("tab", { name: "Timeline" })).not.toBeInTheDocument();
      // Trigger da sub-aba + conteúdo do Mural (stub) — ambos com o texto.
      expect(screen.getAllByText("Mural").length).toBeGreaterThan(0);
    });

    it("vagas públicas aparecem na aba Equipe sem ações admin", async () => {
      const user = userEvent.setup();
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("tab", { name: "Equipe" }));
      await user.click(screen.getByRole("tab", { name: "Vagas" }));

      expect(screen.getByText("Frontend")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Nova Vaga" })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /candidaturas/i })).not.toBeInTheDocument();
    });

    it("candidatura: envio chama candidatarComVaga", async () => {
      const user = userEvent.setup();
      setRole("visitor");
      fetchProjectDetail.mockResolvedValue(makeData());

      renderRota();
      await screen.findByTestId("kanban-board");

      await user.click(screen.getByRole("button", { name: "Candidatar-se ao Squad" }));
      await user.type(
        screen.getByLabelText("Mensagem de Apresentação"),
        "Quero participar do squad!",
      );
      await user.click(screen.getByRole("button", { name: "Enviar Candidatura" }));

      await waitFor(() =>
        expect(candidatarComVaga).toHaveBeenCalledWith("1", {
          vaga_id: null,
          mensagem: "Quero participar do squad!",
        }),
      );
    });
  });
});
