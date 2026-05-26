import { api } from "./api";
import { MOCK_PROJECTS, type Project } from "./projects";

export type KanbanStatus = "todo" | "doing" | "done";

export type KanbanTask = {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  assignee?: string;
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

export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
  try {
    const { data } = await api.get<ProjectDetail>(`/projetos/${id}`);
    if (data && data.id) return data;
  } catch {
    // fallback
  }
  const base = MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0];
  return mockDetail(base);
}

export async function createProject(payload: {
  name: string;
  description: string;
  technologies: string[];
  membersLimit: number;
}): Promise<Project> {
  try {
    const { data } = await api.post<Project>("/projetos", payload);
    if (data?.id) return data;
  } catch {
    // fallback
  }
  return {
    id: `local-${Date.now()}`,
    name: payload.name,
    description: payload.description,
    status: "Aberto",
    technologies: payload.technologies,
    membersCount: 1,
    membersLimit: payload.membersLimit,
    createdBy: "Você",
    createdAt: new Date().toISOString(),
  };
}