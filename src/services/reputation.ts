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

export type HistoryEntry = {
  id: string;
  projectName: string;
  role: "Owner" | "Membro";
  status: "Concluído" | "Em andamento" | "Saiu";
  period: string;
  technologies: string[];
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

const MOCK: Reputation = {
  level: 4,
  xp: 620,
  xpToNext: 1000,
  rating: 4.7,
  reviewsCount: 12,
  projectsCompleted: 5,
  achievements: [
    { id: "a1", label: "Primeiro squad", description: "Participou do primeiro projeto.", icon: "rocket" },
    { id: "a2", label: "Top contributor", description: "Top 3 em entregas no squad.", icon: "trophy" },
    { id: "a3", label: "Code reviewer", description: "Revisou 20+ tarefas.", icon: "code" },
    { id: "a4", label: "5 estrelas", description: "Recebeu nota máxima de outro membro.", icon: "star" },
    { id: "a5", label: "Squad builder", description: "Criou um projeto que completou squad.", icon: "users" },
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
    },
    {
      id: "h2",
      projectName: "Pixel Garden",
      role: "Membro",
      status: "Concluído",
      period: "Jan/2026 — Abr/2026",
      technologies: ["React", "UI/UX"],
    },
    {
      id: "h3",
      projectName: "API Lab",
      role: "Membro",
      status: "Concluído",
      period: "Set/2025 — Dez/2025",
      technologies: ["Node.js", "Docker"],
    },
  ],
};

export async function fetchReputation(userId?: string): Promise<Reputation> {
  try {
    const { data } = await api.get<Reputation>(`/usuarios/${userId ?? "me"}/reputacao`);
    if (data && typeof data.level === "number") return data;
  } catch {
    // fallback
  }
  return MOCK;
}