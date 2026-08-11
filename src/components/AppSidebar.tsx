import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  FolderKanban,
  GitCommitHorizontal,
  LogOut,
  PlusCircle,
  Settings,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { title: "Explorar Projetos", url: "/projetos", icon: Compass },
  { title: "Criar Projeto", url: "/projetos/novo", icon: PlusCircle },
  { title: "Meus Projetos", url: "/meus-projetos", icon: FolderKanban },
  { title: "Meu Perfil", url: "/perfil", icon: User },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

/** ETAPA 13 (Kanban escalável): ranking GLOBAL na sidebar (endpoints existentes). */
const rankingItems = [
  { title: "Top Contributors", url: "/ranking?tab=contributors", icon: Trophy },
  { title: "Top Committers", url: "/ranking?tab=committers", icon: GitCommitHorizontal },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b justify-center">
        <Link to="/dashboard" className="flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          {!collapsed && <span className="font-semibold tracking-tight">MonteSquad</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url || currentPath.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ETAPA 13 (Kanban escalável): ranking global — endpoints existentes. */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ranking</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {rankingItems.map((item) => {
                const active = currentPath === "/ranking";
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to="/ranking"
                        search={{
                          tab: item.title === "Top Contributors" ? "contributors" : "committers",
                        }}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
