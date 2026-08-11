import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ProjectSettings } from "./ProjectSettings";
import type { ProjectDetail } from "@/services/projectDetail";

/**
 * Testes de contrato do ProjectSettings (ETAPA 18 da refatoração UI/UX).
 * O componente é puro de props (data/isOwner/updatePrivacy/updateLinks/
 * closing/onCloseProject) — não há services nem contextos para mockar:
 * as mutations são injetadas como mocks e as chamadas são verificadas.
 * Radix (Select/Switch/Dialog) exige stubs de jsdom (ResizeObserver/
 * scrollIntoView) que o jsdom puro não fornece.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom não implementa Pointer Capture — o trigger do Radix Select usa
  // hasPointerCapture/setPointerCapture no pointerdown (sem isso o listbox
  // não abre e o teste de mudança de visibilidade quebra).
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

// O vitest roda sem `globals: true`, então o auto-cleanup do
// @testing-library/react não registra afterEach sozinho — sem isso o DOM
// acumula entre testes e as queries encontram múltiplos elementos.
afterEach(cleanup);

function makeData(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "1",
    name: "Projeto Teste",
    description: "Descrição do projeto",
    status: "Aberto",
    technologies: ["React"],
    membersCount: 1,
    membersLimit: 5,
    createdBy: "Você",
    createdAt: "2026-01-01T00:00:00.000Z",
    longDescription: "Descrição longa do projeto",
    tasks: [],
    messages: [],
    members: [],
    applications: [],
    vagas: [],
    visibilidade: "publico",
    permitirPortfolioPublico: true,
    ...overrides,
  };
}

function makeMutations() {
  return {
    updatePrivacy: { mutate: vi.fn() },
    updateLinks: { mutate: vi.fn(), isPending: false },
  };
}

function renderSettings({
  data = makeData(),
  isOwner = true,
  closing = false,
  onCloseProject = vi.fn(),
}: {
  data?: ProjectDetail;
  isOwner?: boolean;
  closing?: boolean;
  onCloseProject?: () => void;
} = {}) {
  const mutations = makeMutations();
  const { container } = render(
    <ProjectSettings
      data={data}
      isOwner={isOwner}
      updatePrivacy={mutations.updatePrivacy}
      updateLinks={mutations.updateLinks}
      closing={closing}
      onCloseProject={onCloseProject}
    />,
  );
  return { ...mutations, onCloseProject, container };
}

describe("ProjectSettings (ETAPA 18 — contrato)", () => {
  it("renderiza Privacidade (Select de visibilidade + Switch de portfólio) quando isOwner", () => {
    renderSettings();

    // Cabeçalho da seção e âncora
    expect(screen.getByRole("heading", { name: "Configurações do projeto" })).toBeInTheDocument();

    // Select de visibilidade — combobox com o valor atual do data
    const select = screen.getByLabelText("Visibilidade");
    expect(select).toHaveAttribute("role", "combobox");
    expect(screen.getByRole("combobox")).toHaveTextContent("Público");

    // Switch 'Permitir portfólio público' — espelha data.permitirPortfolioPublico
    const portfolioSwitch = screen.getByLabelText("Permitir portfólio público");
    expect(portfolioSwitch).toHaveAttribute("role", "switch");
    expect(portfolioSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("reflete visibilidade 'privado' e portfólio desativado no data", () => {
    renderSettings({
      data: makeData({ visibilidade: "privado", permitirPortfolioPublico: false }),
    });

    expect(screen.getByRole("combobox")).toHaveTextContent("Privado");
    expect(screen.getByLabelText("Permitir portfólio público")).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("não renderiza nada quando !isOwner (mesmo guarda da rota)", () => {
    const { updatePrivacy, updateLinks, onCloseProject } = renderSettings({
      isOwner: false,
    });

    expect(
      screen.queryByRole("heading", { name: "Configurações do projeto" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Privacidade" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Links de trabalho do squad" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Encerrar projeto" })).not.toBeInTheDocument();
    expect(document.querySelector("#secao-settings")).toBeNull();

    // Nenhum handler da rota é tocado quando não é dono
    expect(updatePrivacy.mutate).not.toHaveBeenCalled();
    expect(updateLinks.mutate).not.toHaveBeenCalled();
    expect(onCloseProject).not.toHaveBeenCalled();
  });

  it("renderiza Links (WorkspaceLinksForm no Dialog) e a seção Encerrar", async () => {
    const user = userEvent.setup();
    renderSettings();

    // Links — seção presente com botão de edição
    expect(screen.getByRole("heading", { name: "Links de trabalho do squad" })).toBeInTheDocument();

    // Encerrar — seção presente com botão de ação (validar ANTES de abrir o
    // Dialog: o Radix aplica aria-hidden no conteúdo atrás do modal)
    expect(screen.getByRole("heading", { name: "Encerrar projeto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encerrar Projeto" })).toBeInTheDocument();

    // Abre o Dialog e valida o WorkspaceLinksForm
    await user.click(screen.getByRole("button", { name: /editar links/i }));
    expect(screen.getByLabelText("Código fonte (GitHub)")).toBeInTheDocument();
    expect(screen.getByLabelText("Protótipo (Figma)")).toBeInTheDocument();
    expect(screen.getByLabelText("Comunicação (Discord/Slack)")).toBeInTheDocument();
    expect(screen.getByLabelText("Documentação (Notion/Wiki)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar links" })).toBeInTheDocument();
  });

  it("chama updatePrivacy.mutate ao mudar a visibilidade no Select", async () => {
    const user = userEvent.setup();
    const { updatePrivacy } = renderSettings();

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Privado" }));

    expect(updatePrivacy.mutate).toHaveBeenCalledWith({ visibilidade: "privado" });
  });

  it("chama updatePrivacy.mutate ao alternar o Switch 'Permitir portfólio público'", async () => {
    const user = userEvent.setup();
    const { updatePrivacy } = renderSettings();

    await user.click(screen.getByLabelText("Permitir portfólio público"));

    expect(updatePrivacy.mutate).toHaveBeenCalledWith({ permitirPortfolioPublico: false });
  });

  it("chama updateLinks.mutate ao salvar o WorkspaceLinksForm", async () => {
    const user = userEvent.setup();
    const { updateLinks } = renderSettings();

    await user.click(screen.getByRole("button", { name: /editar links/i }));
    await user.type(screen.getByLabelText("Código fonte (GitHub)"), "https://github.com/org/repo");
    await user.type(screen.getByLabelText("Protótipo (Figma)"), "https://figma.com/file/abc");
    await user.type(screen.getByLabelText("Comunicação (Discord/Slack)"), "https://discord.gg/abc");
    await user.type(screen.getByLabelText("Documentação (Notion/Wiki)"), "https://notion.so/wiki");
    await user.click(screen.getByRole("button", { name: "Salvar links" }));

    expect(updateLinks.mutate).toHaveBeenCalledWith({
      repositorioUrl: "https://github.com/org/repo",
      figmaUrl: "https://figma.com/file/abc",
      discordUrl: "https://discord.gg/abc",
      documentacaoUrl: "https://notion.so/wiki",
    });
  });

  it("mantém as âncoras secao-settings-privacidade e secao-settings-links", () => {
    const { container } = renderSettings();

    expect(container.querySelector("#secao-settings")).not.toBeNull();
    expect(container.querySelector("#secao-settings-privacidade")).not.toBeNull();
    expect(container.querySelector("#secao-settings-links")).not.toBeNull();
  });

  it("chama onCloseProject ao clicar em Encerrar Projeto", async () => {
    const user = userEvent.setup();
    const { onCloseProject } = renderSettings();

    await user.click(screen.getByRole("button", { name: "Encerrar Projeto" }));

    expect(onCloseProject).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão Encerrar e mostra 'Encerrando...' quando closing", () => {
    renderSettings({ closing: true });

    const button = screen.getByRole("button", { name: "Encerrando..." });
    expect(button).toBeDisabled();
  });

  it("não renderiza a seção Encerrar quando o projeto está Finalizado", () => {
    renderSettings({ data: makeData({ status: "Finalizado" }) });

    expect(screen.queryByRole("heading", { name: "Encerrar projeto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Encerrar Projeto" })).not.toBeInTheDocument();
  });
});
