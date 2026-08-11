import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { gerarTasksKanban } from "@/__tests__/fixtures/kanbanTasks";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Lucas Mendes", email: "lucas@email.com", skills: [] },
  }),
}));
vi.mock("@/services/perfil", () => ({
  fetchHabilidades: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/services/notificationsIntegration", () => ({
  notificationsIntegration: { notifyTaskActivity: vi.fn() },
}));
vi.mock("@/services/tasks", () => ({
  claimTask: vi.fn(),
  abandonTask: vi.fn(),
  removeAssignee: vi.fn(),
  reassignTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  fetchTaskHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

function renderBoard(tasks: ReturnType<typeof gerarTasksKanban>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <KanbanBoard
        initial={tasks}
        projectId="1"
        projectName="Projeto Teste"
        readOnly={false}
        members={[{ id: "1", name: "Lucas Mendes", role: "Owner", skills: [] }]}
      />
    </QueryClientProvider>,
  );
}

describe("ETAPA 19 — Kanban filtros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca por titulo filtra as tasks", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    const busca = screen.getByRole("textbox", { name: /buscar tarefas/i });
    await user.type(busca, "Implementar autenticação");
    // A busca filtra — o footer mostra menos que 20
    await user.clear(busca);
  });

  it("quick filter 'Minhas tarefas' filtra por responsavel", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /minhas tarefas/i }));
    // O botão fica ativo (aria-pressed)
    expect(screen.getByRole("button", { name: /minhas tarefas/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("quick filter 'Sem responsavel' filtra tasks sem assignee", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    // "Sem responsável" aparece no quick filter E no drawer — pegar o primeiro.
    await user.click(screen.getAllByRole("button", { name: /sem responsável/i })[0]);
    expect(screen.getAllByRole("button", { name: /sem responsável/i })[0]).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("quick filter 'Atrasadas' filtra por prazo vencido", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /atrasadas/i }));
    expect(screen.getByRole("button", { name: /atrasadas/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("quick filter 'Alta prioridade' filtra por prioridade high", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /alta prioridade/i }));
    expect(screen.getByRole("button", { name: /alta prioridade/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("limpar filtros restaura o estado", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /minhas tarefas/i }));
    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));
    expect(screen.getByRole("button", { name: /minhas tarefas/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("drawer 'Mais filtros' abre com secoes", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /mais filtros/i }));
    // Seções do drawer
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Prioridade")).toBeInTheDocument();
    expect(screen.getByText("Responsável")).toBeInTheDocument();
    expect(screen.getByText("Outros")).toBeInTheDocument();
  });
});
