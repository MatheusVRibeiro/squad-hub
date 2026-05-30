import { toast } from "sonner";
import { addLocalNotification, type NotificationType } from "./notifications";

/**
 * Serviço simulado de Integração com API Externa de Notificações (ex: API XYZ / OneSignal / Pusher)
 * Dispara notificações visuais imediatas (toasts) e as registra no histórico de notificações do usuário.
 */
export const notificationsIntegration = {
  /**
   * Notifica quando uma nova candidatura é enviada
   */
  notifyApplied(projectName: string, applicantName: string, projectId: string) {
    const title = "Nova candidatura";
    const description = `${applicantName} enviou uma solicitação para entrar no squad de ${projectName}.`;
    
    // 1. Salva no banco local de notificações
    addLocalNotification({
      type: "application",
      title,
      description,
      link: `/projetos/${projectId}`,
    });

    // 2. Dispara o toast sonner
    toast.success(`${applicantName} quer participar do seu projeto!`, {
      description: "Confira a aba Candidaturas.",
    });

    // Log para fins de simulação de chamada de API XYZ externa
    console.log(`[API XYZ] Notificação de Candidatura enviada: Project=${projectName}, Applicant=${applicantName}`);
  },

  /**
   * Notifica quando o status de uma candidatura é alterado (Aprovado / Rejeitado)
   */
  notifyApplicationStatus(projectName: string, applicantName: string, status: "approved" | "rejected", projectId: string) {
    const isApproved = status === "approved";
    const title = isApproved ? "Você foi aprovado!" : "Candidatura atualizada";
    const description = isApproved 
      ? `Bem-vindo ao squad do projeto ${projectName}.`
      : `Sua candidatura para o projeto ${projectName} foi avaliada.`;
    
    addLocalNotification({
      type: isApproved ? "approved" : "system",
      title,
      description,
      link: `/projetos/${projectId}`,
    });

    if (isApproved) {
      toast.success(`Parabéns! Você foi aprovado no squad de ${projectName}!`, {
        duration: 5000,
      });
    } else {
      toast.info(`Candidatura em ${projectName} foi recusada.`, {
        description: "Continue explorando outros squads!",
      });
    }

    console.log(`[API XYZ] Notificação de Candidatura ${status} enviada: Project=${projectName}, User=${applicantName}`);
  },

  /**
   * Notifica quando uma mensagem é postada no Mural
   */
  notifyMuralMessage(projectName: string, author: string, contentSnippet: string, projectId: string) {
    const title = "Nova mensagem no mural";
    const snippet = contentSnippet.length > 40 ? contentSnippet.slice(0, 40) + "..." : contentSnippet;
    const description = `${author} publicou uma atualização em ${projectName}: "${snippet}"`;

    addLocalNotification({
      type: "message",
      title,
      description,
      link: `/projetos/${projectId}`,
    });

    toast.info(`Nova postagem no mural de ${projectName}`, {
      description: `"${snippet}" por ${author}`,
    });

    console.log(`[API XYZ] Notificação de Mural enviada: Project=${projectName}, Author=${author}`);
  },

  /**
   * Notifica sobre alteração ou atribuição de tarefas no Kanban
   */
  notifyTaskActivity(projectName: string, taskTitle: string, activityType: "created" | "moved", details: string, projectId: string) {
    const title = activityType === "created" ? "Tarefa criada" : "Tarefa atualizada";
    const description = activityType === "created"
      ? `A tarefa "${taskTitle}" foi adicionada ao projeto ${projectName}.`
      : `A tarefa "${taskTitle}" em ${projectName} foi movida para ${details}.`;

    addLocalNotification({
      type: "task",
      title,
      description,
      link: `/projetos/${projectId}`,
    });

    toast(`Atividade de tarefa em ${projectName}`, {
      description,
    });

    console.log(`[API XYZ] Notificação de Kanban enviada: Project=${projectName}, Task=${taskTitle}, Action=${activityType}`);
  }
};
