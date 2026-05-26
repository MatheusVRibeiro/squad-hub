import { api } from "./api";

export type ProjectStatus = "Aberto" | "Em andamento" | "Finalizado";

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  technologies: string[];
  membersCount: number;
  membersLimit: number;
  createdBy: string;
  createdAt: string; // ISO
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "MonteSquad Web",
    description: "Plataforma para formação de squads e projetos colaborativos.",
    status: "Aberto",
    technologies: ["React", "Node.js", "Docker"],
    membersCount: 3,
    membersLimit: 6,
    createdBy: "Ana Souza",
    createdAt: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "2",
    name: "API de Pagamentos",
    description: "Microsserviço de cobrança recorrente com Stripe e webhooks.",
    status: "Em andamento",
    technologies: ["Node.js", "Docker", "DevOps"],
    membersCount: 4,
    membersLimit: 5,
    createdBy: "Bruno Lima",
    createdAt: "2026-04-22T08:30:00.000Z",
  },
  {
    id: "3",
    name: "Design System Aurora",
    description: "Biblioteca de componentes acessíveis e tokens semânticos.",
    status: "Aberto",
    technologies: ["React", "UI/UX"],
    membersCount: 2,
    membersLimit: 4,
    createdBy: "Carla Mendes",
    createdAt: "2026-05-18T16:45:00.000Z",
  },
  {
    id: "4",
    name: "Bot de Suporte IA",
    description: "Assistente conversacional com RAG sobre base de conhecimento.",
    status: "Em andamento",
    technologies: ["Python", "DevOps"],
    membersCount: 3,
    membersLimit: 4,
    createdBy: "Diego Rocha",
    createdAt: "2026-03-30T09:10:00.000Z",
  },
  {
    id: "5",
    name: "Onboarding Mobile",
    description: "Fluxo de onboarding gamificado para novos usuários.",
    status: "Finalizado",
    technologies: ["React", "UI/UX"],
    membersCount: 5,
    membersLimit: 5,
    createdBy: "Erica Tavares",
    createdAt: "2026-01-12T14:00:00.000Z",
  },
  {
    id: "6",
    name: "Infra como Código",
    description: "Pipeline de provisionamento multi-cloud com Terraform.",
    status: "Aberto",
    technologies: ["Docker", "DevOps"],
    membersCount: 1,
    membersLimit: 4,
    createdBy: "Felipe Andrade",
    createdAt: "2026-05-20T11:25:00.000Z",
  },
];

/**
 * Busca projetos do backend. Em caso de erro (ex: backend offline durante o
 * preview), retorna mock data para não quebrar a experiência.
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const { data } = await api.get<Project[]>("/projetos");
    if (Array.isArray(data) && data.length > 0) return data;
    return MOCK_PROJECTS;
  } catch {
    return MOCK_PROJECTS;
  }
}

export async function requestProjectJoin(projectId: string): Promise<void> {
  try {
    await api.post(`/projetos/${projectId}/solicitacoes`);
  } catch {
    // Fallback silencioso para preview sem backend
    await new Promise((r) => setTimeout(r, 600));
  }
}