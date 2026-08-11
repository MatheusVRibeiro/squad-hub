import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

import { AppSidebar } from "@/components/AppSidebar";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, unknown>;
  }) => <a href={`${to}?tab=${search?.tab ?? ""}`}>{children}</a>,
  useRouterState: ({ select }: { select?: (s: unknown) => unknown }) =>
    select
      ? select({ location: { pathname: "/dashboard" } })
      : { location: { pathname: "/dashboard" } },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSidebar: () => ({ state: "expanded" }),
}));

afterEach(() => {
  cleanup();
});

describe("ETAPA 19 — AppSidebar com grupo Ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe grupo Ranking com Top Contributors e Top Committers", () => {
    render(<AppSidebar />);
    expect(screen.getByText("Ranking")).toBeInTheDocument();
    expect(screen.getByText("Top Contributors")).toBeInTheDocument();
    expect(screen.getByText("Top Committers")).toBeInTheDocument();
  });

  it("links do ranking apontam para /ranking com tab correta", () => {
    render(<AppSidebar />);
    const contributors = screen.getByText("Top Contributors").closest("a");
    const committers = screen.getByText("Top Committers").closest("a");
    expect(contributors?.getAttribute("href")).toContain("/ranking");
    expect(contributors?.getAttribute("href")).toContain("contributors");
    expect(committers?.getAttribute("href")).toContain("committers");
  });

  it("mantem itens do Workspace", () => {
    render(<AppSidebar />);
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Explorar Projetos")).toBeInTheDocument();
    expect(screen.getByText("Meus Projetos")).toBeInTheDocument();
  });
});
