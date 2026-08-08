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

/**
 * Formato retornado pelo backend em GET /notificacoes (autenticado):
 * { sucesso, message, dados: [{ id, tipo, titulo, descricao, link, lida, criado_em }], nItens }
 */
type ApiNotification = {
  id: string;
  tipo: NotificationType;
  titulo: string;
  descricao: string;
  link?: string | null;
  lida: boolean;
  criado_em: string;
};

type NotificationsApiResponse = {
  sucesso: boolean;
  message?: string;
  dados?: ApiNotification[];
  nItens?: number;
};

const isDev = () => import.meta.env.DEV;

/**
 * Mock usado APENAS como fallback em DEV (backend local fora do ar).
 * Em PROD nunca é lido — falhas propagam o erro (sem fallback silencioso).
 */
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

export function getLocalNotifications(): AppNotification[] {
  if (typeof window === "undefined") return MOCK;
  const stored = window.localStorage.getItem("@montesquad:notifications");
  if (!stored) {
    window.localStorage.setItem("@montesquad:notifications", JSON.stringify(MOCK));
    return MOCK;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return MOCK;
  }
}

export function saveLocalNotifications(notifications: AppNotification[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("@montesquad:notifications", JSON.stringify(notifications));
  }
}

export function addLocalNotification(
  n: Omit<AppNotification, "id" | "createdAt" | "read">,
): AppNotification {
  const notifications = getLocalNotifications();
  const newNotif: AppNotification = {
    ...n,
    id: `notif-${Date.now()}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(newNotif); // mais recentes primeiro
  saveLocalNotifications(notifications);
  return newNotif;
}

/** Mapeia o formato do backend (snake_case) para o contrato do frontend (camelCase). */
function mapNotification(n: ApiNotification): AppNotification {
  return {
    id: n.id,
    type: n.tipo,
    title: n.titulo,
    description: n.descricao,
    createdAt: n.criado_em,
    read: n.lida,
    link: n.link ?? undefined,
  };
}

function sortNewestFirst(list: AppNotification[]): AppNotification[] {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Busca as notificações reais do backend (GET /notificacoes).
 * - PROD: falha → lança o erro (sem fallback/mock).
 * - DEV: falha → fallback local (mock) para desenvolvimento sem backend.
 * Durante SSR retorna vazio — o cliente busca os dados reais (não há token no servidor).
 */
export async function fetchNotifications(): Promise<AppNotification[]> {
  if (typeof window === "undefined") return [];

  try {
    const { data } = await api.get<NotificationsApiResponse | ApiNotification[]>("/notificacoes");
    const raw = Array.isArray(data) ? data : data?.dados;

    if (!Array.isArray(raw)) {
      if (isDev()) return sortNewestFirst(getLocalNotifications());
      throw new Error("Resposta inesperada de GET /notificacoes (esperado { dados: [...] }).");
    }

    const notifications = sortNewestFirst(raw.map(mapNotification));
    if (isDev()) saveLocalNotifications(notifications);
    return notifications;
  } catch (error) {
    if (isDev()) return sortNewestFirst(getLocalNotifications());
    throw error;
  }
}

/**
 * Marca todas as notificações como lidas (POST /notificacoes/ler-tudo).
 * - PROD: falha → lança o erro.
 * - DEV: mantém o armazenamento local em sincronia.
 */
export async function markAllRead(): Promise<void> {
  try {
    await api.post("/notificacoes/ler-tudo");
  } catch (error) {
    if (!isDev()) throw error;
  }

  if (isDev()) {
    const notifications = getLocalNotifications();
    notifications.forEach((n) => (n.read = true));
    saveLocalNotifications(notifications);
  }
}
