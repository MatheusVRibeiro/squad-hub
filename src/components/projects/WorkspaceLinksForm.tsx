import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Formulário de edição dos links de trabalho (usado no Dialog do dono).
 * Extraído de src/routes/projetos.$id.tsx na refatoração UI/UX — ETAPA 1.
 * Lógica idêntica à original.
 */
export function WorkspaceLinksForm({
  initial,
  submitting,
  onSave,
}: {
  initial: {
    repositorioUrl?: string;
    figmaUrl?: string;
    discordUrl?: string;
    documentacaoUrl?: string;
  };
  submitting: boolean;
  onSave: (links: {
    repositorioUrl?: string;
    figmaUrl?: string;
    discordUrl?: string;
    documentacaoUrl?: string;
  }) => void;
}) {
  const [repositorioUrl, setRepositorioUrl] = useState(initial.repositorioUrl ?? "");
  const [figmaUrl, setFigmaUrl] = useState(initial.figmaUrl ?? "");
  const [discordUrl, setDiscordUrl] = useState(initial.discordUrl ?? "");
  const [documentacaoUrl, setDocumentacaoUrl] = useState(initial.documentacaoUrl ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      repositorioUrl: repositorioUrl.trim() || undefined,
      figmaUrl: figmaUrl.trim() || undefined,
      discordUrl: discordUrl.trim() || undefined,
      documentacaoUrl: documentacaoUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="link-github" className="text-xs font-semibold uppercase tracking-wide">
          Código fonte (GitHub)
        </Label>
        <Input
          id="link-github"
          type="url"
          placeholder="https://github.com/org/repo"
          value={repositorioUrl}
          onChange={(e) => setRepositorioUrl(e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="link-figma" className="text-xs font-semibold uppercase tracking-wide">
          Protótipo (Figma)
        </Label>
        <Input
          id="link-figma"
          type="url"
          placeholder="https://figma.com/file/..."
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="link-discord" className="text-xs font-semibold uppercase tracking-wide">
          Comunicação (Discord/Slack)
        </Label>
        <Input
          id="link-discord"
          type="url"
          placeholder="https://discord.gg/..."
          value={discordUrl}
          onChange={(e) => setDiscordUrl(e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="link-docs" className="text-xs font-semibold uppercase tracking-wide">
          Documentação (Notion/Wiki)
        </Label>
        <Input
          id="link-docs"
          type="url"
          placeholder="https://notion.so/..."
          value={documentacaoUrl}
          onChange={(e) => setDocumentacaoUrl(e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
        {submitting ? "Salvando..." : "Salvar links"}
      </Button>
    </form>
  );
}
