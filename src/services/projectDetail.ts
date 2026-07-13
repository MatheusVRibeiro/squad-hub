import { api } from "./api";
import { getLocalProjects, saveLocalProjects, MOCK_PROJECTS, type Project } from "./projects";

export type KanbanStatus = "todo" | "doing" | "done";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type SubTask = {
  id: string;
  title: string;
  done: boolean;
};

export type KanbanTask = {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  subtasks?: SubTask[];
};

export type MuralMessage = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  role: "Owner" | "Membro";
  skills: string[];
};

export type Application = {
  id: string;
  name: string;
  message: string;
  skills: string[];
  createdAt: string;
  status: "pending" | "approved" | "rejected";
};

export type ProjectDetail = Project & {
  longDescription: string;
  tasks: KanbanTask[];
  messages: MuralMessage[];
  members: Member[];
  applications: Application[];
};

function mockDetail(p: Project): ProjectDetail {
  return {
    ...p,
    longDescription:
      p.description +
      " Este squad se reúne semanalmente para alinhar metas, revisar entregas e planejar próximos passos.",
    tasks: [
      { id: "t1", title: "Definir escopo do MVP", status: "done", assignee: p.createdBy },
      { id: "t2", title: "Configurar repositório e CI", status: "done" },
      { id: "t3", title: "Modelar banco de dados", status: "doing", assignee: "Ana Souza" },
      { id: "t4", title: "Tela de listagem de projetos", status: "doing" },
      { id: "t5", title: "Sistema de candidaturas", status: "todo" },
      { id: "t6", title: "Deploy em staging", status: "todo" },
    ],
    messages: [
      {
        id: "m1",
        author: p.createdBy,
        content: "Bem-vindos ao squad! Vamos começar mapeando as tarefas iniciais.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      },
      {
        id: "m2",
        author: "Ana Souza",
        content: "Subi o protótipo no Figma — link no canal do Discord.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
    ],
    members: [
      { id: "u1", name: p.createdBy, role: "Owner", skills: p.technologies.slice(0, 2) },
      { id: "u2", name: "Ana Souza", role: "Membro", skills: ["React", "UI/UX"] },
      { id: "u3", name: "Bruno Lima", role: "Membro", skills: ["Node.js", "DevOps"] },
    ],
    applications: [
      {
        id: "a1",
        name: "Diego Rocha",
        message: "Tenho experiência com Node e gostaria de contribuir no backend.",
        skills: ["Node.js", "Docker"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        status: "pending",
      },
      {
        id: "a2",
        name: "Erica Tavares",
        message: "Posso ajudar com fluxo de onboarding e design.",
        skills: ["UI/UX", "React"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        status: "pending",
      },
    ],
  };
}

// ... type definitions remain the same ...

export function getLocalProjectDetail(id: string): ProjectDetail {
  if (typeof window === "undefined") {
    const base = MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0];
    return mockDetail(base);
  }

  const stored = window.localStorage.getItem(`@montesquad:project-detail:${id}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  // Se não existir o detalhe localmente, busca nas informações gerais do projeto
  const projects = getLocalProjects();
  const base = projects.find((p) => p.id === id) ?? projects[0] ?? MOCK_PROJECTS[0];
  const detail = mockDetail(base);
  window.localStorage.setItem(`@montesquad:project-detail:${id}`, JSON.stringify(detail));
  return detail;
}

export function saveLocalProjectDetail(id: string, detail: ProjectDetail) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`@montesquad:project-detail:${id}`, JSON.stringify(detail));

    // Sincroniza informações gerais de volta na lista de projetos
    const projects = getLocalProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        membersCount: detail.members.length,
        status: detail.status,
      };
      saveLocalProjects(projects);
    }
  }
}

export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
  try {
    const { data } = await api.get<any>(`/projetos/${id}`);
    if (data && data.sucesso && data.dados && data.dados.id) {
      saveLocalProjectDetail(id, data.dados);
      return data.dados;
    }
    return getLocalProjectDetail(id);
  } catch {
    return getLocalProjectDetail(id);
  }
}

export async function createProject(payload: {
  name: string;
  description: string;
  technologies: string[];
  membersLimit: number;
  repositorioUrl?: string;
  figmaUrl?: string;
  discordUrl?: string;
  documentacaoUrl?: string;
}): Promise<Project> {
  try {
    const { data } = await api.post<{ sucesso: boolean; message: string; dados: any }>("/projetos", {
      name: payload.name,
      description: payload.description,
      membersLimit: payload.membersLimit,
      repositorioUrl: payload.repositorioUrl,
      figmaUrl: payload.figmaUrl,
      discordUrl: payload.discordUrl,
      documentacaoUrl: payload.documentacaoUrl,
    });
    if (data?.sucesso && data?.dados) {
      const p = data.dados;
      let status: ProjectStatus = "Aberto";
      if (p.status === "em_andamento") status = "Em andamento";
      if (p.status === "finalizado") status = "Finalizado";

      return {
        id: String(p.id),
        name: p.titulo || "",
        description: p.descricao || "",
        status,
        technologies: payload.technologies,
        membersCount: 1,
        membersLimit: p.limite_membros || 5,
        createdBy: "Você",
        createdAt: p.criado_em || new Date().toISOString(),
        repositorioUrl: p.repositorio_url || undefined,
        figmaUrl: p.figma_url || undefined,
        discordUrl: p.discord_url || undefined,
        documentacaoUrl: p.documentacao_url || undefined,
      };
    }
  } catch {
    // fallback
  }

  const newProject: Project = {
    id: `local-${Date.now()}`,
    name: payload.name,
    description: payload.description,
    status: "Aberto",
    technologies: payload.technologies,
    membersCount: 1,
    membersLimit: payload.membersLimit,
    createdBy: "Você",
    createdAt: new Date().toISOString(),
    repositorioUrl: payload.repositorioUrl,
    figmaUrl: payload.figmaUrl,
    discordUrl: payload.discordUrl,
    documentacaoUrl: payload.documentacaoUrl,
  };

  // Salva na lista de projetos local
  const projects = getLocalProjects();
  projects.push(newProject);
  saveLocalProjects(projects);

  // Cria e salva o detalhe inicial
  const detail: ProjectDetail = {
    ...newProject,
    longDescription:
      payload.description +
      " Este squad se reúne semanalmente para alinhar metas e planejar próximos passos.",
    tasks: [
      { id: "t1", title: "Configurar repositório e README", status: "todo" },
      { id: "t2", title: "Mapear backlog inicial", status: "todo" },
    ],
    messages: [
      {
        id: "m1",
        author: "Você",
        content: "Squad criado! Sejam bem-vindos.",
        createdAt: new Date().toISOString(),
      },
    ],
    members: [
      { id: "u-owner", name: "Você", role: "Owner", skills: payload.technologies.slice(0, 2) },
    ],
    applications: [],
  };
  saveLocalProjectDetail(newProject.id, detail);

  return newProject;
}

// Funções extras de mutação para desenvolvimento offline

export async function addLocalTask(
  projectId: string,
  title: string,
  extra?: Partial<Omit<KanbanTask, "id" | "title">>,
): Promise<KanbanTask> {
  try {
    const detail = getLocalProjectDetail(projectId);
    const member = detail?.members?.find((m) => m.name === extra?.assignee);
    const responsavel_id = member ? Number(member.id) : null;

    const { data } = await api.post<{
      sucesso: boolean;
      message: string;
      dados: {
        id: number;
        projeto_id: string;
        responsavel_id: number | null;
        titulo: string;
        descricao: string | null;
        status: KanbanStatus;
        prioridade: "low" | "medium" | "high";
        data_vencimento: string | null;
      };
    }>(`/projetos/${projectId}/tarefas`, {
      titulo: title,
      descricao: extra?.description,
      prioridade: extra?.priority,
      data_vencimento: extra?.dueDate || null,
      responsavel_id,
    });

    if (data.sucesso && data.dados) {
      const created: KanbanTask = {
        id: String(data.dados.id),
        title: data.dados.titulo,
        description: data.dados.descricao || undefined,
        status: data.dados.status,
        priority: data.dados.prioridade,
        dueDate: data.dados.data_vencimento || undefined,
        assignee: extra?.assignee,
        subtasks: [],
      };

      // Cache locally as well
      detail.tasks.push(created);
      saveLocalProjectDetail(projectId, detail);
      return created;
    }
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  const newTask: KanbanTask = {
    id: `task-${Date.now()}`,
    title,
    status: "todo",
    ...extra,
  };
  detail.tasks.push(newTask);
  saveLocalProjectDetail(projectId, detail);
  return newTask;
}

export async function updateLocalTaskStatus(
  projectId: string,
  taskId: string,
  status: KanbanStatus,
): Promise<void> {
  try {
    await api.patch(`/projetos/${projectId}/tarefas/${taskId}`, { status });
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  detail.tasks = detail.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
  saveLocalProjectDetail(projectId, detail);
}

export async function updateLocalTaskAssignee(
  projectId: string,
  taskId: string,
  assigneeName: string | undefined,
): Promise<void> {
  try {
    const detail = getLocalProjectDetail(projectId);
    const member = detail?.members?.find((m) => m.name === assigneeName);
    const responsavel_id = member ? Number(member.id) : null;

    await api.patch(`/projetos/${projectId}/tarefas/${taskId}`, {
      responsavel_id,
    });
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  detail.tasks = detail.tasks.map((t) => (t.id === taskId ? { ...t, assignee: assigneeName } : t));
  saveLocalProjectDetail(projectId, detail);
}

export async function updateLocalTaskDetails(
  projectId: string,
  taskId: string,
  updates: Partial<Omit<KanbanTask, "id" | "status">>,
): Promise<void> {
  try {
    const detail = getLocalProjectDetail(projectId);
    const member = detail?.members?.find((m) => m.name === updates.assignee);
    const responsavel_id = member ? Number(member.id) : null;

    const payload: any = {};
    if (updates.title !== undefined) payload.titulo = updates.title;
    if (updates.description !== undefined) payload.descricao = updates.description;
    if (updates.priority !== undefined) payload.prioridade = updates.priority;
    if (updates.dueDate !== undefined) payload.data_vencimento = updates.dueDate || null;
    if (updates.assignee !== undefined) payload.responsavel_id = responsavel_id;
    if (updates.subtasks !== undefined) {
      payload.subtasks = updates.subtasks.map((s) => ({
        title: s.title,
        done: s.done,
      }));
    }

    await api.patch(`/projetos/${projectId}/tarefas/${taskId}`, payload);
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  detail.tasks = detail.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
  saveLocalProjectDetail(projectId, detail);
}

export async function addLocalMuralMessage(
  projectId: string,
  author: string,
  content: string,
): Promise<MuralMessage> {
  try {
    const { data } = await api.post<{ sucesso: boolean; message: string; dados: any }>(`/projetos/${projectId}/mensagens`, { content });
    if (data?.sucesso && data?.dados) {
      return {
        id: String(data.dados.id),
        author,
        content: data.dados.conteudo,
        createdAt: data.dados.criado_em || new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  const newMessage: MuralMessage = {
    id: `msg-${Date.now()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  };
  detail.messages.unshift(newMessage); // mais recentes primeiro
  saveLocalProjectDetail(projectId, detail);
  return newMessage;
}

export async function updateLocalApplicationStatus(
  projectId: string,
  applicationId: string,
  status: "approved" | "rejected",
): Promise<void> {
  try {
    const backendStatus = status === "approved" ? "aceito" : "rejeitado";
    await api.patch(`/projetos/${projectId}/candidaturas/${applicationId}`, { status: backendStatus });
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  const app = detail.applications.find((a) => a.id === applicationId);
  if (app) {
    app.status = status;
    if (status === "approved") {
      // Se aprovado, adiciona aos membros do projeto
      const exists = detail.members.some((m) => m.name === app.name);
      if (!exists) {
        detail.members.push({
          id: `u-${app.id}`,
          name: app.name,
          role: "Membro",
          skills: app.skills,
        });
        detail.membersCount = detail.members.length;
      }
    }
    saveLocalProjectDetail(projectId, detail);
  }
}

export async function applyToProjectLocal(
  projectId: string,
  applicant: { name: string; message: string; skills: string[] },
): Promise<void> {
  const detail = getLocalProjectDetail(projectId);
  const newApp: Application = {
    id: `app-${Date.now()}`,
    name: applicant.name,
    message: applicant.message,
    skills: applicant.skills,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  detail.applications.push(newApp);
  saveLocalProjectDetail(projectId, detail);
}

export async function closeProjectLocal(projectId: string): Promise<void> {
  try {
    await api.patch(`/projetos/${projectId}`, { status: "finalizado" });
  } catch {
    // ignore
  }

  const detail = getLocalProjectDetail(projectId);
  detail.status = "Finalizado";
  saveLocalProjectDetail(projectId, detail);
}
