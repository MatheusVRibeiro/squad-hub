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

describe("ETAPA 19 — Kanban modo Lista", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggle para modo lista mostra a tabela", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    // Tabela com cabeçalhos
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /task/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /responsável/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /prioridade/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /prazo/i })).toBeInTheDocument();
  });

  it("modo lista mostra as mesmas tasks filtradas", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    // 20 tasks na tabela (linhas de corpo)
    const linhas = screen.getAllByRole("row");
    // 1 header + 20 linhas = 21
    expect(linhas.length).toBe(21);
  });

  it("alternar Quadro/Lista nao perde filtros", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(20));
    // Ativar filtro "Minhas tarefas"
    await user.click(screen.getByRole("button", { name: /minhas tarefas/i }));
    // Ir para lista
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    // O filtro continua ativo (aria-pressed true)
    expect(screen.getByRole("button", { name: /minhas tarefas/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Voltar para quadro
    await user.click(screen.getByRole("button", { name: /modo quadro/i }));
    expect(screen.getByRole("button", { name: /minhas tarefas/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("modo lista com 0 tasks mostra empty state", async () => {
    const user = userEvent.setup();
    renderBoard([]);
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    expect(screen.getByText(/nenhuma tarefa corresponde/i)).toBeInTheDocument();
  });
});
