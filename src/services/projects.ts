import { api } from "./api";
// Fallbacks mock — uso exclusivo em DEV (ver fetchProjects). Import local para
// uso direto + re-export abaixo para compatibilidade com services/projectDetail.ts.
import { getLocalProjects, saveLocalProjects } from "./mocks";

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

// MOCK_PROJECTS / getLocalProjects / saveLocalProjects foram movidos para
// src/services/mocks.ts (uso exclusivo em DEV). Re-exportados daqui para não
// quebrar importações existentes (ex: services/projectDetail.ts).
export { MOCK_PROJECTS, getLocalProjects, saveLocalProjects } from "./mocks";

/**
 * Busca projetos do backend.
 * - DEV: em caso de erro (ex: backend offline durante o preview), cai no mock
 *   persistido no localStorage para não quebrar a experiência.
 * - PROD: NÃO há fallback silencioso — loga o erro e lança para a UI exibir o
 *   estado de erro (ProjectsError).
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
      if (import.meta.env.DEV) {
        saveLocalProjects(mapped);
      }
      return mapped;
    }

    // Resposta inesperada do backend (sucesso: false ou dados ausentes)
    if (import.meta.env.DEV) {
      return getLocalProjects();
    }
    const error = new Error("Resposta inesperada do servidor ao listar projetos.");
    console.error("[projects] fetchProjects:", error);
    throw error;
  } catch (err) {
    if (import.meta.env.DEV) {
      return getLocalProjects();
    }
    console.error("[projects] fetchProjects:", err);
    throw err instanceof Error ? err : new Error("Falha ao buscar projetos.");
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
