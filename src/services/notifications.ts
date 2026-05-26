import { api } from "./api";

export type NotificationType = "application" | "message" | "task" | "system" | "approved";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  link?: string;
};

const MOCK: AppNotification[] = [
  {
    id: "n1",
    type: "application",
    title: "Nova candidatura",
    description: "Diego Rocha quer entrar no squad do projeto MonteSquad MVP.",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    read: false,
    link: "/projetos/1",
  },
  {
    id: "n2",
    type: "approved",
    title: "Você foi aprovado!",
    description: "Bem-vindo ao squad do projeto Pixel Garden.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    read: false,
    link: "/projetos/2",
  },
  {
    id: "n3",
    type: "message",
    title: "Nova mensagem no mural",
    description: "Ana Souza publicou uma atualização em MonteSquad MVP.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    read: true,
    link: "/projetos/1",
  },
  {
    id: "n4",
    type: "task",
    title: "Tarefa atribuída",
    description: "“Modelar banco de dados” foi atribuída a você.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    read: true,
    link: "/projetos/1",
  },
  {
    id: "n5",
    type: "system",
    title: "Bem-vindo ao MonteSquad",
    description: "Complete seu perfil para receber convites de squads.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    read: true,
    link: "/perfil",
  },
];

export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const { data } = await api.get<AppNotification[]>("/notificacoes");
    if (Array.isArray(data)) return data;
  } catch {
    // fallback
  }
  return MOCK;
}

export async function markAllRead(): Promise<void> {
  try {
    await api.post("/notificacoes/ler-tudo");
  } catch {
    // ignore
  }
}