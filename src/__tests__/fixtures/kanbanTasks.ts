import type { KanbanTask } from "@/services/projectDetail";

/**
 * ETAPA 18 (Kanban escalável) — gerador de fixtures de tasks para testes de
 * performance/volume. Gera 20/100/200 tasks distribuídas entre os 4 status.
 */
const TITLES = [
  "Implementar autenticação",
  "Criar endpoint de usuários",
  "Configurar CI/CD",
  "Refatorar componente de lista",
  "Escrever testes unitários",
  "Corrigir bug de login",
  "Documentar API",
  "Otimizar queries",
  "Adicionar paginação",
  "Configurar monitoramento",
  "Migrar banco de dados",
  "Criar dashboard",
  "Implementar busca",
  "Configurar cache",
  "Revisar pull requests",
  "Deploy em produção",
  "Criar landing page",
  "Integrar gateway de pagamento",
  "Configurar logs estruturados",
  "Implementar notificações",
];

const PRIORITIES: KanbanTask["priority"][] = ["low", "medium", "high"];
const STATUSES: KanbanTask["status"][] = ["todo", "doing", "review", "done"];
const ASSIGNEES = ["Lucas Mendes", "Roberto Almeida", "Fernanda Souza", undefined];

export function gerarTasksKanban(count: number): KanbanTask[] {
  return Array.from({ length: count }, (_, i) => {
    const status = STATUSES[i % STATUSES.length];
    const assignee = ASSIGNEES[i % ASSIGNEES.length];
    const dueDate =
      i % 3 === 0 ? new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10) : undefined;
    return {
      id: String(i + 1),
      title: `${TITLES[i % TITLES.length]} #${i + 1}`,
      description: `Descrição da tarefa de teste ${i + 1} para validação de escala.`,
      status,
      priority: PRIORITIES[i % PRIORITIES.length],
      assignee,
      assigneeId: assignee ? i : undefined,
      dueDate,
      subtasks: i % 4 === 0 ? [{ id: `s${i}`, title: "Sub", done: i % 2 === 0 }] : [],
      habilidades: i % 3 === 0 ? ["Node.js", "React"] : [],
      dificuldade: i % 3 === 0 ? "intermediaria" : undefined,
      createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    };
  });
}
