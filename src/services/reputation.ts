import { api } from "./api";

export type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: "trophy" | "star" | "flame" | "rocket" | "users" | "code";
};

export type Review = {
  id: string;
  author: string;
  projectName: string;
  rating: number; // 0..5
  comment: string;
  createdAt: string;
};

/** ETAPA 10: vínculo do usuário com o projeto (soft-delete preserva o histórico). */
export type MemberStatus = "ativo" | "saiu" | "removido";

export type HistoryEntry = {
  id: string;
  projectName: string;
  role: "Owner" | "Membro";
  status: "Concluído" | "Em andamento" | "Saiu";
  period: string;
  technologies: string[];
  /**
   * ETAPA 10: status do vínculo em membros_equipe. 'saiu'/'removido' NÃO
   * apagam o projeto do histórico — a participação permanece visível.
   */
  memberStatus: MemberStatus;
  /** ETAPA 10: função exercida no squad (ex.: "Backend") quando o backend expõe. */
  funcao?: string;
  /** ETAPA 10: quantidade de tarefas verificadas no projeto (opcional). */
  tasksVerified?: number;
};

export type Reputation = {
  level: number;
  xp: number;
  xpToNext: number;
  rating: number; // average
  reviewsCount: number;
  projectsCompleted: number;
  achievements: Achievement[];
  reviews: Review[];
  history: HistoryEntry[];
};

/**
 * Dados MOCK de reputação — uso EXCLUSIVO em desenvolvimento (import.meta.env.DEV).
 *
 * Em produção o backend é a única fonte de verdade: fetchReputation NÃO cai neste
 * fallback quando import.meta.env.PROD (lança erro e a UI trata). Mantidos também
 * para getLocalReputation/saveLocalReputation/awardLocalXP (XP local do Kanban).
 */
const MOCK: Reputation = {
  level: 4,
  xp: 620,
  xpToNext: 1000,
  rating: 4.7,
  reviewsCount: 12,
  projectsCompleted: 5,
  achievements: [
    {
      id: "a1",
      label: "Primeiro squad",
      description: "Participou do primeiro projeto.",
      icon: "rocket",
    },
    {
      id: "a2",
      label: "Top contributor",
      description: "Top 3 em entregas no squad.",
      icon: "trophy",
    },
    { id: "a3", label: "Code reviewer", description: "Revisou 20+ tarefas.", icon: "code" },
    {
      id: "a4",
      label: "5 estrelas",
      description: "Recebeu nota máxima de outro membro.",
      icon: "star",
    },
    {
      id: "a5",
      label: "Squad builder",
      description: "Criou um projeto que completou squad.",
      icon: "users",
    },
    { id: "a6", label: "Streak 7 dias", description: "Ativo por 7 dias seguidos.", icon: "flame" },
  ],
  reviews: [
    {
      id: "r1",
      author: "Ana Souza",
      projectName: "MonteSquad MVP",
      rating: 5,
      comment: "Comunicação excelente e entregas rápidas. Recomendo demais.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    {
      id: "r2",
      author: "Bruno Lima",
      projectName: "Pixel Garden",
      rating: 4,
      comment: "Ótimo trabalho técnico, sempre disponível para pair programming.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    },
    {
      id: "r3",
      author: "Carla Mendes",
      projectName: "API Lab",
      rating: 5,
      comment: "Pessoa parceira, focada e que eleva o nível do squad.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    },
  ],
  history: [
    {
      id: "h1",
      projectName: "MonteSquad MVP",
      role: "Owner",
      status: "Em andamento",
      period: "Mai/2026 — atual",
      technologies: ["React", "Node.js", "Postgres"],
      // ETAPA 10: vínculo ativo — sem badge de saída.
      memberStatus: "ativo",
      funcao: "Full Stack",
      tasksVerified: 12,
    },
    {
      id: "h2",
      projectName: "Pixel Garden",
      role: "Membro",
      status: "Concluído",
      period: "Jan/2026 — Abr/2026",
      technologies: ["React", "UI/UX"],
      memberStatus: "ativo",
      funcao: "Frontend",
      tasksVerified: 8,
    },
    {
      id: "h3",
      projectName: "API Lab",
      role: "Membro",
      status: "Concluído",
      period: "Set/2025 — Dez/2025",
      technologies: ["Node.js", "Docker"],
      // ETAPA 10: saiu do squad, mas o projeto permanece no histórico.
      memberStatus: "saiu",
      funcao: "Backend",
      tasksVerified: 3,
    },
    {
      id: "h4",
      projectName: "Bot de Monitoria",
      role: "Membro",
      status: "Em andamento",
      period: "Fev/2026 — Mar/2026",
      technologies: ["Python"],
      // ETAPA 10: removido pelo owner — contribuição anterior não é apagada.
      memberStatus: "removido",
      funcao: "Data",
    },
  ],
};

export function getLocalReputation(): Reputation {
  if (typeof window === "undefined") return MOCK;
  const stored = window.localStorage.getItem("@montesquad:reputation");
  if (!stored) {
    window.localStorage.setItem("@montesquad:reputation", JSON.stringify(MOCK));
    return MOCK;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return MOCK;
  }
}

export function saveLocalReputation(rep: Reputation) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("@montesquad:reputation", JSON.stringify(rep));
  }
}

export async function awardLocalXP(
  amount: number,
): Promise<{ levelUp: boolean; nextLevel: number }> {
  const rep = getLocalReputation();
  let xp = rep.xp + amount;
  let level = rep.level;
  let xpToNext = rep.xpToNext;
  let levelUp = false;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = level * 250; // progressiva simples
    levelUp = true;
  }

  const updatedRep: Reputation = { ...rep, level, xp, xpToNext };
  saveLocalReputation(updatedRep);

  if (levelUp && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("squadhub:levelup", {
        detail: { level, xpToNext },
      }),
    );
  }

  return { levelUp, nextLevel: level };
}

// ---------------------------------------------------------------------------
// Integração real com GET /usuarios/:id/reputacao (alias "me" = autenticado)
// ---------------------------------------------------------------------------

const ACHIEVEMENT_ICONS = ["trophy", "star", "flame", "rocket", "users", "code"] as const;
type AchievementIcon = (typeof ACHIEVEMENT_ICONS)[number];

const HISTORY_STATUS: readonly HistoryEntry["status"][] = ["Concluído", "Em andamento", "Saiu"];

/** ETAPA 10: status do vínculo aceitos pelo contrato (soft-delete de membros). */
const MEMBER_STATUS: readonly MemberStatus[] = ["ativo", "saiu", "removido"];

type ReputationResponse = {
  sucesso: boolean;
  message: string;
  dados: {
    level: number;
    xp: number;
    xpToNext: number;
    rating: number;
    reviewsCount: number;
    projectsCompleted: number;
    achievements: {
      id: string | number;
      label: string;
      description: string | null;
      icon: string;
    }[];
    reviews: {
      id: string | number;
      author: string;
      projectName: string | null;
      rating: number;
      comment: string | null;
      createdAt: string;
    }[];
    history: {
      id: string | number;
      projectName: string;
      role: string;
      status: string;
      period: string;
      technologies: string[];
      /** ETAPA 10: status do vínculo (me.status) — 'saiu'/'removido' preservam o histórico. */
      memberStatus?: string | null;
      /** ETAPA 10: função exercida no squad (me.funcao) quando o backend expõe. */
      funcao?: string | null;
      /** ETAPA 10: tarefas verificadas no projeto (opcional). */
      tasksVerified?: number | null;
    }[];
  };
};

function mapReputation(dados: ReputationResponse["dados"]): Reputation {
  return {
    level: typeof dados.level === "number" ? dados.level : 0,
    xp: typeof dados.xp === "number" ? dados.xp : 0,
    // Guard contra divisão por zero no ReputationOverview (Progress)
    xpToNext: typeof dados.xpToNext === "number" && dados.xpToNext > 0 ? dados.xpToNext : 100,
    rating: typeof dados.rating === "number" ? dados.rating : 0,
    reviewsCount: typeof dados.reviewsCount === "number" ? dados.reviewsCount : 0,
    projectsCompleted: typeof dados.projectsCompleted === "number" ? dados.projectsCompleted : 0,
    achievements: (Array.isArray(dados.achievements) ? dados.achievements : []).map((a) => ({
      id: String(a.id),
      label: a.label ?? "",
      description: a.description ?? "",
      // Ícone do backend pode vir com qualquer string — normaliza para o union
      icon: (ACHIEVEMENT_ICONS as readonly string[]).includes(a.icon)
        ? (a.icon as AchievementIcon)
        : "trophy",
    })),
    reviews: (Array.isArray(dados.reviews) ? dados.reviews : []).map((r) => ({
      id: String(r.id),
      author: r.author ?? "",
      projectName: r.projectName ?? "Projeto",
      rating: typeof r.rating === "number" ? r.rating : 0,
      comment: r.comment ?? "",
      createdAt: r.createdAt ?? "",
    })),
    history: (Array.isArray(dados.history) ? dados.history : []).map((h) => ({
      id: String(h.id),
      projectName: h.projectName ?? "",
      role: h.role === "Owner" ? "Owner" : "Membro",
      status: (HISTORY_STATUS as readonly string[]).includes(h.status)
        ? (h.status as HistoryEntry["status"])
        : "Em andamento",
      period: h.period ?? "",
      technologies: Array.isArray(h.technologies) ? h.technologies.map(String) : [],
      // ETAPA 10: normaliza o vínculo; valor desconhecido → 'ativo' (retrocompatível
      // com o backend pré-ETAPA 6, que não expunha me.status).
      memberStatus: (MEMBER_STATUS as readonly string[]).includes(h.memberStatus ?? "")
        ? (h.memberStatus as MemberStatus)
        : "ativo",
      funcao: h.funcao && String(h.funcao).trim() ? String(h.funcao).trim() : undefined,
      tasksVerified:
        typeof h.tasksVerified === "number" && h.tasksVerified >= 0 ? h.tasksVerified : undefined,
    })),
  };
}

export async function fetchReputation(userId?: string): Promise<Reputation> {
  try {
    const { data } = await api.get<ReputationResponse>(`/usuarios/${userId ?? "me"}/reputacao`);
    if (data?.sucesso && data.dados && typeof data.dados.level === "number") {
      return mapReputation(data.dados);
    }
    throw new Error("Resposta de reputação inválida do servidor.");
  } catch (err) {
    // Fallback SOMENTE em desenvolvimento (backend offline). Em produção,
    // lança o erro para a UI tratar — nunca mostrar dados fictícios.
    if (import.meta.env.DEV) {
      console.warn("[reputation] API indisponível em DEV; usando mock:", err);
      return MOCK;
    }
    throw err instanceof Error ? err : new Error("Falha ao carregar reputação.");
  }
}
