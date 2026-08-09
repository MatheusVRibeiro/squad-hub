import axios from "axios";
import { api } from "./api";
import { normalizarVaga, type Vaga } from "./vagas";
import {
  getLocalProjects,
  saveLocalProjects,
  MOCK_PROJECTS,
  type Project,
  type ProjectStatus,
} from "./projects";

export type KanbanStatus = "todo" | "doing" | "review" | "done";

export type TaskPriority = "low" | "medium" | "high" | "critical";

/** ETAPA 7: dificuldade da tarefa — valores do ENUM do backend. */
export type TaskDificuldade = "iniciante" | "intermediaria" | "avancada";

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
  createdAt?: string;
  // GitHub (ETAPAS 2/8)
  githubBranch?: string;
  githubPrNumber?: number;
  githubPrUrl?: string;
  githubPrStatus?: string;
  githubLastActivityAt?: string;
  githubCommitsCount?: number;
  completionSource?: string;
  completedAt?: string;
  assigneeId?: number;
  // ETAPA 7: dificuldade e habilidades esperadas da tarefa (backend retorna
  // `habilidades` com nomes; `habilidadeIds` alimenta o payload de criação/edição).
  dificuldade?: TaskDificuldade;
  habilidades?: string[];
  habilidadeIds?: number[];
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
  /** ETAPA 6: função do membro no squad — vem do JOIN com funcoes (funcao_nome). */
  funcao_id?: number | null;
  funcao_nome?: string | null;
  /** ETAPA 6: vaga de origem (membros_equipe.vaga_id) — presente quando o membro entrou por vaga. */
  vaga_id?: number | null;
  vaga_nome?: string | null;
  /** ETAPA 6: nível esperado herdado da vaga (iniciante/intermediario/avancado). */
  nivel_desejado?: string | null;
  /** ETAPA 6: soft-state do vínculo — 'saiu'/'removido' não aparecem na lista ativa. */
  status?: "ativo" | "saiu" | "removido" | string | null;
};

export type Application = {
  id: string;
  /** Id do usuário candidato (mapeado de usuario_id/userId/usuarioId quando o
   *  backend enviar) — permite comparar candidatura do usuário por id (A2),
   *  em vez de por nome (homônimos). Backend pré-correção não envia → undefined. */
  userId?: string;
  name: string;
  message: string;
  skills: string[];
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  /** ETAPA 5: vaga vinculada à candidatura (opcional) — `vaga_id`/`vaga_nome` vindos do backend. */
  vaga_id?: number | null;
  vaga_nome?: string | null;
};

export type ProjectDetail = Project & {
  /** Id do usuário criador — mapeado de `criador_id` (snake_case) do backend GET /projetos/:id.
   *  Permite isOwner/isMember por id (FASE-03.H) em vez de comparação por nome. */
  creatorId?: string;
  longDescription: string;
  tasks: KanbanTask[];
  messages: MuralMessage[];
  members: Member[];
  applications: Application[];
  /** Vagas do projeto (ETAPA 4) — array camelCase/snake_case vindo do GET /projetos/:id. */
  vagas: Vaga[];
  /** ETAPA 14: visibilidade do projeto — ENUM('publico','privado') do backend (DEFAULT 'publico'). */
  visibilidade?: "publico" | "privado";
  /** ETAPA 14: se o projeto pode aparecer no portfólio público dos membros (DEFAULT true).
   *  `false` faz o portfólio tratar o projeto como privado (sem detalhes técnicos). */
  permitirPortfolioPublico?: boolean;
};

/** Wrapper padrão das respostas da API (sucesso/message/dados). */
type ApiResponse<T> = {
  sucesso: boolean;
  message?: string;
  dados: T;
};

/** Contrato do GET /projetos/:id — o backend já devolve o shape camelCase
 *  consumido pela UI (FASE-04) acrescido de `criador_id`/`criador_nome` e
 *  `vagas` (array da ETAPA 4, camelCase com funcaoNome). ETAPA 14 adiciona
 *  `visibilidade` (idêntico em snake/camel) e `permitir_portfolio_publico`
 *  (snake_case da coluna) — a UI consome a variante camelCase mapeada. */
type ProjectDetailData = ProjectDetail & {
  criador_id?: number | null;
  criador_nome?: string;
  vagas?: Record<string, unknown>[];
  /** ETAPA 14: variante snake_case de permitirPortfolioPublico — o GET pode
   *  devolver camelCase; o mapeamento tolerante aceita os dois. */
  permitir_portfolio_publico?: boolean;
};

/** Contrato do POST /projetos — campos snake_case do backend. */
type CreateProjectData = {
  id: number;
  criador_id?: number;
  titulo?: string;
  descricao?: string | null;
  status?: string;
  limite_membros?: number | null;
  criado_em?: string | null;
  repositorio_url?: string | null;
  figma_url?: string | null;
  discord_url?: string | null;
  documentacao_url?: string | null;
};

/** Contrato do POST /projetos/:id/mensagens. */
type MuralMessageData = {
  id: number;
  conteudo: string;
  criado_em?: string | null;
};

/**
 * Normaliza acentos/maiúsculas para casar nomes de tecnologias com a base
 * global de habilidades (mesmo critério usado em services/perfil.ts).
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Normaliza uma candidatura vinda do backend para o tipo `Application` da UI.
 * Aceita o shape camelCase do GET /projetos/:id (id/name/message/skills) e,
 * desde a ETAPA 5, os campos de vaga — `vaga_id`/`vaga_nome` (snake_case do
 * SQL) ou `vagaId`/`vagaNome` (camelCase). Ausência de vaga → null.
 */
function normalizarApplication(raw: Record<string, unknown>): Application {
  const statusRaw = String(raw.status ?? "pendente");
  let status: Application["status"] = "pending";
  if (statusRaw === "approved" || statusRaw === "aceito") status = "approved";
  if (statusRaw === "rejected" || statusRaw === "rejeitado") status = "rejected";

  const vagaId = raw.vaga_id ?? raw.vagaId;
  const vagaNome = raw.vaga_nome ?? raw.vagaNome ?? raw.funcao_nome;
  // A2: id do usuário candidato — tolerante a snake (usuario_id) e camel
  // (userId/usuarioId); ausente quando o backend ainda não envia o campo.
  const userId = raw.usuario_id ?? raw.userId ?? raw.usuarioId;

  return {
    id: String(raw.id),
    userId: userId != null ? String(userId) : undefined,
    name: String(raw.name ?? raw.usuario_nome ?? "Usuário"),
    message: String(raw.message ?? raw.mensagem ?? ""),
    skills: Array.isArray(raw.skills) ? raw.skills.map((s) => String(s)) : [],
    createdAt: String(raw.createdAt ?? raw.criado_em ?? new Date().toISOString()),
    status,
    vaga_id: vagaId != null ? Number(vagaId) : null,
    vaga_nome: vagaNome != null ? String(vagaNome) : null,
  };
}

/**
 * Normaliza um membro vindo do backend para o tipo `Member` da UI (ETAPA 6).
 * Aceita o shape camelCase da FASE-04 (id/name/role/skills) e os campos novos
 * de função/vaga em snake_case (funcao_nome, vaga_id) OU camelCase
 * (funcaoNome, vagaId). Ausência de função/vaga → null; status ausente é
 * tratado como 'ativo' (retrocompatível com o backend pré-ETAPA 6).
 */
function normalizarMember(raw: Record<string, unknown>): Member {
  const roleRaw = String(raw.role ?? "Membro");
  const funcaoId = raw.funcao_id ?? raw.funcaoId;
  const funcaoNome = raw.funcao_nome ?? raw.funcaoNome;
  const vagaId = raw.vaga_id ?? raw.vagaId;
  const vagaNome = raw.vaga_nome ?? raw.vagaNome;
  const nivel = raw.nivel_desejado ?? raw.nivelDesejado;
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.usuario_nome ?? "Membro"),
    role: roleRaw === "Owner" ? "Owner" : "Membro",
    skills: Array.isArray(raw.skills) ? raw.skills.map((s) => String(s)) : [],
    funcao_id: funcaoId != null ? Number(funcaoId) : null,
    funcao_nome: funcaoNome != null ? String(funcaoNome) : null,
    vaga_id: vagaId != null ? Number(vagaId) : null,
    vaga_nome: vagaNome != null ? String(vagaNome) : null,
    nivel_desejado: nivel != null ? String(nivel) : null,
    status: raw.status != null ? String(raw.status) : "ativo",
  };
}

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
        vaga_id: null,
        vaga_nome: null,
      },
      {
        id: "a2",
        name: "Erica Tavares",
        message: "Posso ajudar com fluxo de onboarding e design.",
        skills: ["UI/UX", "React"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        status: "pending",
        vaga_id: null,
        vaga_nome: null,
      },
    ],
    vagas: [],
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
    const { data } = await api.get<ApiResponse<ProjectDetailData | null>>(`/projetos/${id}`);
    if (data && data.sucesso && data.dados && data.dados.id) {
      // FASE-03.H: o backend retorna criador_id em snake_case no detalhe; expõe
      // no contrato camelCase (creatorId) para comparações por id na UI. O spread
      // preserva todos os demais campos que a UI já consome.
      const detail: ProjectDetail = {
        ...data.dados,
        creatorId: data.dados.criador_id != null ? String(data.dados.criador_id) : undefined,
        // ETAPA 4: vagas vêm no detalhe (camelCase) — normaliza para o contrato da UI.
        vagas: Array.isArray(data.dados.vagas) ? data.dados.vagas.map(normalizarVaga) : [],
        // ETAPA 10: tarefas arquivadas (excluida_em não-nulo) nunca chegam ao Kanban —
        // o backend já filtra, mas o frontend aplica defesa em profundidade.
        tasks: Array.isArray(data.dados.tasks)
          ? data.dados.tasks.filter(
              (t) => !(t as KanbanTask & { excluida_em?: string | null }).excluida_em,
            )
          : [],
        // ETAPA 5: candidaturas ganham vaga_id/vaga_nome — normaliza (snake ou camel).
        applications: Array.isArray(data.dados.applications)
          ? data.dados.applications.map((a) =>
              normalizarApplication(a as unknown as Record<string, unknown>),
            )
          : [],
        // ETAPA 14: permissão de portfólio público — aceita a variante snake_case
        // da coluna OU a camelCase do GET /projetos/:id. Ausência (backend
        // pré-ETAPA 14) mantém o DEFAULT do schema (true) para não marcar
        // projetos antigos como privados por engano. `visibilidade` passa pelo
        // spread (nome idêntico em snake/camel).
        permitirPortfolioPublico:
          data.dados.permitir_portfolio_publico ?? data.dados.permitirPortfolioPublico ?? true,
        // ETAPA 6: membros ganham função/vaga/status — normaliza (snake ou camel) e
        // mantém apenas vínculos ativos ('saiu'/'removido' ficam fora da lista).
        members: Array.isArray(data.dados.members)
          ? data.dados.members
              .map((m) => normalizarMember(m as unknown as Record<string, unknown>))
              .filter((m) => !m.status || m.status === "ativo")
          : [],
      };
      if (import.meta.env.DEV) {
        saveLocalProjectDetail(id, detail);
      }
      return detail;
    }

    // Resposta inesperada do backend
    if (import.meta.env.DEV) {
      return getLocalProjectDetail(id);
    }
    const error = new Error(`Projeto ${id} não encontrado ou resposta inesperada.`);
    console.error("[projectDetail] fetchProjectDetail:", error);
    throw error;
  } catch (err) {
    if (import.meta.env.DEV) {
      return getLocalProjectDetail(id);
    }
    console.error("[projectDetail] fetchProjectDetail:", err);
    throw err instanceof Error ? err : new Error("Falha ao carregar o projeto.");
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
    const { data } = await api.post<ApiResponse<CreateProjectData | null>>("/projetos", {
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

      // Persistência best-effort das tecnologias (stack) do projeto: busca a
      // base global de habilidades, casa os nomes (normalizando acentos) e
      // vincula via POST /habilidades-projeto em paralelo. Falhas aqui NÃO
      // derrubam a criação do projeto — apenas logam e seguem.
      const projetoId: number = p.id;
      if (Array.isArray(payload.technologies) && payload.technologies.length > 0) {
        try {
          const { data: habData } = await api.get<{
            sucesso: boolean;
            dados: { id: number; nome: string }[];
          }>("/habilidades");
          const habilidades = habData?.dados ?? [];
          const byNormalizedName = new Map<string, number>();
          habilidades.forEach((h) => byNormalizedName.set(normalizeText(h.nome), h.id));

          await Promise.all(
            payload.technologies.map(async (techName) => {
              const habilidadeId = byNormalizedName.get(normalizeText(techName));
              if (!habilidadeId) {
                console.warn(
                  `[projeto] Tecnologia "${techName}" não encontrada na base global de habilidades; ignorada.`,
                );
                return;
              }
              try {
                await api.post("/habilidades-projeto", {
                  projeto_id: projetoId,
                  habilidade_id: habilidadeId,
                });
              } catch (err) {
                console.warn(
                  `[projeto] Falha ao vincular tecnologia "${techName}" ao projeto ${projetoId}:`,
                  err,
                );
              }
            }),
          );
        } catch (err) {
          console.warn("[projeto] Falha ao persistir tecnologias do projeto:", err);
        }
      }

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
    // ignore
  }

  throw new Error("Não foi possível criar o projeto.");
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
        dificuldade?: TaskDificuldade;
        habilidades?: { id: number; nome: string }[] | string[];
      };
    }>(`/projetos/${projectId}/tarefas`, {
      titulo: title,
      descricao: extra?.description,
      prioridade: extra?.priority,
      data_vencimento: extra?.dueDate || null,
      responsavel_id,
      // ETAPA 7: dificuldade (ENUM) e habilidades esperadas (array de ids).
      dificuldade: extra?.dificuldade || "intermediaria",
      habilidades: extra?.habilidadeIds ?? [],
    });

    // Anti-fallback: resposta sem sucesso PROPAGA erro — nunca "finge sucesso"
    // com task local (correção C2 do QA). A UI (KanbanBoard) mostra toast de erro.
    if (!data.sucesso || !data.dados) {
      throw new Error(data.message || "Não foi possível criar a tarefa.");
    }

    return {
      id: String(data.dados.id),
      title: data.dados.titulo,
      description: data.dados.descricao || undefined,
      status: data.dados.status,
      priority: data.dados.prioridade,
      dueDate: data.dados.data_vencimento || undefined,
      assignee: extra?.assignee,
      subtasks: [],
      dificuldade: data.dados.dificuldade || extra?.dificuldade,
      habilidadeIds: extra?.habilidadeIds ?? [],
      habilidades: extra?.habilidades ?? [],
    };
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível criar a tarefa.");
  }
}

export async function updateLocalTaskStatus(
  projectId: string,
  taskId: string,
  status: KanbanStatus,
): Promise<void> {
  try {
    const { data } = await api.patch<ApiResponse<unknown>>(
      `/projetos/${projectId}/tarefas/${taskId}`,
      { status },
    );
    if (!data?.sucesso) {
      throw new Error(data?.message || "Não foi possível atualizar o status da tarefa.");
    }
  } catch (err) {
    // Anti-fallback: a falha PROPAGA para a UI exibir toast de erro — nenhuma
    // escrita local "fingindo" persistência (correção C2 do QA).
    throw toFriendlyError(err, "Não foi possível atualizar o status da tarefa.");
  }
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

    const { data } = await api.patch<ApiResponse<unknown>>(
      `/projetos/${projectId}/tarefas/${taskId}`,
      {
        responsavel_id,
      },
    );
    if (!data?.sucesso) {
      throw new Error(data?.message || "Não foi possível atribuir o responsável.");
    }
  } catch (err) {
    // Anti-fallback: a falha PROPAGA para a UI exibir toast de erro (C2).
    throw toFriendlyError(err, "Não foi possível atribuir o responsável.");
  }
}

/**
 * POST /projetos/:projetoId/tarefas/:tarefaId/assumir — membro assume task livre (ETAPA 7).
 * Retorna a task atualizada (status doing + github_branch quando aplicável).
 */
export async function claimTask(
  projectId: string | number,
  taskId: string | number,
): Promise<KanbanTask> {
  const { data } = await api.post<ApiResponse<KanbanTask | null>>(
    `/projetos/${projectId}/tarefas/${taskId}/assumir`,
  );
  if (!data.sucesso || !data.dados) {
    throw new Error(data.message || "Falha ao assumir tarefa");
  }
  return data.dados;
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

    const payload: {
      titulo?: string;
      descricao?: string | null;
      prioridade?: "low" | "medium" | "high";
      data_vencimento?: string | null;
      responsavel_id?: number | null;
      subtasks?: { title: string; done: boolean }[];
      dificuldade?: TaskDificuldade;
      habilidades?: number[];
    } = {};
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
    // ETAPA 7: dificuldade (ENUM) e habilidades (array de ids) na edição.
    if (updates.dificuldade !== undefined) payload.dificuldade = updates.dificuldade;
    if (updates.habilidadeIds !== undefined) payload.habilidades = updates.habilidadeIds;

    const { data } = await api.patch<ApiResponse<unknown>>(
      `/projetos/${projectId}/tarefas/${taskId}`,
      payload,
    );
    if (!data?.sucesso) {
      throw new Error(data?.message || "Não foi possível salvar os detalhes da tarefa.");
    }
  } catch (err) {
    // Anti-fallback: a falha PROPAGA para a UI exibir toast de erro (C2).
    throw toFriendlyError(err, "Não foi possível salvar os detalhes da tarefa.");
  }
}

export async function addLocalMuralMessage(
  projectId: string,
  author: string,
  content: string,
): Promise<MuralMessage> {
  try {
    const { data } = await api.post<ApiResponse<MuralMessageData | null>>(
      `/projetos/${projectId}/mensagens`,
      { content },
    );
    if (data?.sucesso && data?.dados) {
      return {
        id: String(data.dados.id),
        author,
        content: data.dados.conteudo || content,
        createdAt: data.dados.criado_em || new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }

  throw new Error("Não foi possível enviar a mensagem.");
}

export async function updateLocalApplicationStatus(
  projectId: string,
  applicationId: string,
  status: "approved" | "rejected",
): Promise<void> {
  try {
    const backendStatus = status === "approved" ? "aceito" : "rejeitado";
    await api.patch(`/projetos/${projectId}/candidaturas/${applicationId}`, {
      status: backendStatus,
    });
  } catch {
    throw new Error(
      status === "approved"
        ? "Não foi possível aprovar a candidatura."
        : "Não foi possível rejeitar a candidatura.",
    );
  }
}

export async function applyToProjectLocal(
  projectId: string,
  applicant: { name: string; message: string; skills: string[]; vagaId?: number },
): Promise<void> {
  try {
    // ETAPA 4/5: candidatura pode ser vinculada a uma vaga (opcional) — o
    // backend ETAPA 5 valida a pertinência da vaga e atualiza `preenchidas`
    // ao aceitar. Quando vagaId é undefined, o JSON serializado omite a chave.
    await api.post(`/projetos/${projectId}/candidaturas`, {
      vaga_id: applicant.vagaId,
      mensagem: applicant.message,
    });
  } catch {
    throw new Error("Não foi possível enviar a candidatura.");
  }
}

export async function closeProjectLocal(projectId: string): Promise<void> {
  try {
    const { data } = await api.patch<ApiResponse<unknown>>(`/projetos/${projectId}`, {
      status: "finalizado",
    });
    if (!data?.sucesso) {
      throw new Error(data?.message || "Não foi possível encerrar o projeto.");
    }
  } catch (err) {
    // Anti-fallback: a falha PROPAGA para a UI exibir toast de erro (C2).
    throw toFriendlyError(err, "Não foi possível encerrar o projeto.");
  }
}

function toFriendlyError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

/**
 * ETAPA 14 — PATCH /projetos/:id atualiza a privacidade do projeto.
 *
 * O backend aceita `visibilidade` (ENUM 'publico'|'privado') e
 * `permitir_portfolio_publico` (boolean) — rota protegida por
 * somenteDonoDoProjeto. Payload envia snake_case (contrato do PATCH); a UI
 * consome camelCase (`permitirPortfolioPublico`), convertido aqui.
 *
 * Anti-fallback: em caso de erro a falha PROPAGA (mensagem amigável do
 * servidor quando houver) — a UI faz rollback otimista + toast.
 */
export async function atualizarVisibilidadeProjeto(
  projectId: string | number,
  changes: {
    visibilidade?: "publico" | "privado";
    permitirPortfolioPublico?: boolean;
  },
): Promise<void> {
  const payload: {
    visibilidade?: "publico" | "privado";
    permitir_portfolio_publico?: boolean;
  } = {};
  if (changes.visibilidade !== undefined) payload.visibilidade = changes.visibilidade;
  if (changes.permitirPortfolioPublico !== undefined) {
    payload.permitir_portfolio_publico = changes.permitirPortfolioPublico;
  }

  try {
    await api.patch(`/projetos/${projectId}`, payload);
  } catch (err) {
    throw toFriendlyError(err, "Não foi possível atualizar a privacidade do projeto.");
  }
}
