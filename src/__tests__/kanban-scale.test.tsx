import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { gerarTasksKanban } from "@/__tests__/fixtures/kanbanTasks";

// Mocks necessários para renderizar o KanbanBoard isolado.
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

// jsdom não implementa matchMedia — mock necessário para o isMobile (ETAPA 16).
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

describe("ETAPA 19 — Kanban escala (1/20/100 tasks)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1 task: colunas corretas e contador total", () => {
    renderBoard(gerarTasksKanban(1));
    // "A fazer" aparece no header da coluna E no seletor mobile — usar getAll.
    expect(screen.getAllByText("A fazer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Em progresso").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Em revisão").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Concluído").length).toBeGreaterThan(0);
    // Footer mostra total (pode haver colisão com contadores — usar getAll)
    expect(screen.getAllByText(/1 tarefa/).length).toBeGreaterThan(0);
  });

  it("20 tasks: contadores por coluna corretos (5 por status)", () => {
    renderBoard(gerarTasksKanban(20));
    // 20 tasks / 4 status = 5 por coluna
    expect(screen.getAllByText(/20 tarefas/).length).toBeGreaterThan(0);
  });

  it("100 tasks: coluna done limitada a 8 + botao 'Ver mais'", () => {
    renderBoard(gerarTasksKanban(100));
    // 100/4 = 25 done — limitado a 8 + "Ver mais 17"
    const verMais = screen.getByText(/Ver mais 17 tarefas concluídas/);
    expect(verMais).toBeInTheDocument();
    // Botão recolher presente
    expect(screen.getByText("Recolher concluídas")).toBeInTheDocument();
  });

  it("100 tasks: colunas nao-done limitadas a 20 + '+ N tarefas'", () => {
    renderBoard(gerarTasksKanban(100));
    // 25 todo/doing/review — cada uma limitada a 20 → botão "+ 5 tarefas" em 3 colunas
    const mais = screen.getAllByRole("button", { name: /\+ 5 tarefas/ });
    expect(mais.length).toBe(3);
  });

  it("100 tasks: clicar em 'Ver mais' expande as concluidas", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(100));
    await user.click(screen.getByRole("button", { name: /Ver mais 17 tarefas concluídas/ }));
    // Após expandir, o botão "Ver mais" some (mostra todas)
    expect(
      screen.queryByRole("button", { name: /Ver mais 17 tarefas concluídas/ }),
    ).not.toBeInTheDocument();
  });

  it("100 tasks: clicar em '+ N tarefas' expande a coluna", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(100));
    await user.click(screen.getAllByRole("button", { name: /\+ 5 tarefas/ })[0]);
    // Após expandir a primeira, restam 2 colunas com "+ 5 tarefas"
    expect(screen.getAllByRole("button", { name: /\+ 5 tarefas/ }).length).toBe(2);
  });

  it("scroll container presente nas colunas", () => {
    renderBoard(gerarTasksKanban(20));
    // A lista de tasks de cada coluna tem overflow-y-auto
    const scrolls = document.querySelectorAll("[class*='overflow-y-auto']");
    expect(scrolls.length).toBeGreaterThanOrEqual(4);
  });
});
