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
  repositorioUrl?: string;
  figmaUrl?: string;
  discordUrl?: string;
  documentacaoUrl?: string;
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
 * Auxiliares de persistência local para desenvolvimento sem backend
 */
export function getLocalProjects(): Project[] {
  if (typeof window === "undefined") return MOCK_PROJECTS;
  const stored = window.localStorage.getItem("@montesquad:projects");
  if (!stored) {
    window.localStorage.setItem("@montesquad:projects", JSON.stringify(MOCK_PROJECTS));
    return MOCK_PROJECTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return MOCK_PROJECTS;
  }
}

export function saveLocalProjects(projects: Project[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("@montesquad:projects", JSON.stringify(projects));
  }
}

/**
 * Busca projetos do backend. Em caso de erro (ex: backend offline durante o
 * preview), retorna mock data persistido no localStorage para não quebrar a experiência.
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const { data } = await api.get<{
      sucesso: boolean;
      dados: {
        id: number;
        criador_id: number;
        criador_nome: string | null;
        titulo: string;
        descricao: string | null;
        status: "aberto" | "em_andamento" | "finalizado";
        limite_membros: number;
        criado_em: string;
        total_membros: number;
        repositorio_url?: string | null;
        figma_url?: string | null;
        discord_url?: string | null;
        documentacao_url?: string | null;
        tecnologias?: string[] | string | null;
      }[];
    }>("/projetos");

    if (data.sucesso && Array.isArray(data.dados)) {
      const mapped = data.dados.map((p) => {
        let status: ProjectStatus = "Aberto";
        if (p.status === "em_andamento") status = "Em andamento";
        if (p.status === "finalizado") status = "Finalizado";

        // O backend retorna `tecnologias` como array de nomes (ou string
        // separada por "||" em versões antigas); normaliza para array.
        const tecnologias: string[] = Array.isArray(p.tecnologias)
          ? p.tecnologias
          : typeof p.tecnologias === "string" && p.tecnologias.length > 0
            ? p.tecnologias.split("||")
            : [];

        return {
          id: String(p.id),
          name: p.titulo,
          description: p.descricao || "",
          status,
          technologies: tecnologias,
          membersCount: p.total_membros,
          membersLimit: p.limite_membros,
          createdBy: p.criador_nome || "Desconhecido",
          createdAt: p.criado_em,
          repositorioUrl: p.repositorio_url || undefined,
          figmaUrl: p.figma_url || undefined,
          discordUrl: p.discord_url || undefined,
          documentacaoUrl: p.documentacao_url || undefined,
        };
      });
      saveLocalProjects(mapped);
      return mapped;
    }
    return getLocalProjects();
  } catch {
    return getLocalProjects();
  }
}

export async function requestProjectJoin(projectId: string): Promise<void> {
  try {
    await api.post(`/projetos/${projectId}/candidaturas`, {
      mensagem: "Gostaria de participar do projeto!",
    });
  } catch {
    // Fallback silencioso para preview sem backend: cria candidatura local
    await new Promise((r) => setTimeout(r, 600));
  }
}
