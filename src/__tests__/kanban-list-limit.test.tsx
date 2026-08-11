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

describe("ETAPA perf — modo Lista com carregamento progressivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("120 tasks: lista mostra 50 linhas + 'Ver mais 70'", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(120));
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    // 1 header + 50 linhas = 51 rows
    expect(screen.getAllByRole("row").length).toBe(51);
    // Footer "Ver mais 70 tarefas"
    expect(screen.getByRole("button", { name: /ver mais 70 tarefas/i })).toBeInTheDocument();
  });

  it("120 tasks: clicar em 'Ver mais' mostra todas", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(120));
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    await user.click(screen.getByRole("button", { name: /ver mais 70 tarefas/i }));
    // 1 header + 120 linhas = 121 rows
    expect(screen.getAllByRole("row").length).toBe(121);
    expect(screen.queryByRole("button", { name: /ver mais 70 tarefas/i })).not.toBeInTheDocument();
  });

  it("30 tasks: lista mostra todas sem footer (<= 50)", async () => {
    const user = userEvent.setup();
    renderBoard(gerarTasksKanban(30));
    await user.click(screen.getByRole("button", { name: /modo lista/i }));
    // 1 header + 30 linhas = 31 rows
    expect(screen.getAllByRole("row").length).toBe(31);
    expect(screen.queryByRole("button", { name: /ver mais/i })).not.toBeInTheDocument();
  });
});
