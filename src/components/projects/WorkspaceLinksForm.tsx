import { useState } from "react";
import { FolderGit2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseRepositories,
  serializeRepositories,
  type RepositoryLink,
} from "@/services/projectDetail";

const PRESET_LABELS = ["Frontend", "Backend", "API", "Mobile", "Monorepo"];

/**
 * Formulário de edição dos links de trabalho do squad (com múltiplos repositórios).
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
  const initialRepos = parseRepositories(initial.repositorioUrl);
  const [repos, setRepos] = useState<RepositoryLink[]>(
    initialRepos.length > 0 ? initialRepos : [{ nome: "GitHub", url: "" }]
  );
  const [figmaUrl, setFigmaUrl] = useState(initial.figmaUrl ?? "");
  const [discordUrl, setDiscordUrl] = useState(initial.discordUrl ?? "");
  const [documentacaoUrl, setDocumentacaoUrl] = useState(initial.documentacaoUrl ?? "");

  const handleAddRepo = () => {
    const nextLabel =
      repos.length === 1 && repos[0].nome === "Frontend"
        ? "Backend"
        : repos.length === 2
        ? "Mobile"
        : "Repositório";
    setRepos((prev) => [...prev, { nome: nextLabel, url: "" }]);
  };

  const handleRemoveRepo = (index: number) => {
    setRepos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ nome: "Frontend", url: "" }];
    });
  };

  const handleRepoChange = (index: number, field: "nome" | "url", value: string) => {
    setRepos((prev) =>
      prev.map((repo, i) => (i === index ? { ...repo, [field]: value } : repo))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      repositorioUrl: serializeRepositories(repos),
      figmaUrl: figmaUrl.trim() || undefined,
      discordUrl: discordUrl.trim() || undefined,
      documentacaoUrl: documentacaoUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Seção Múltiplos Repositórios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="link-github" className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <FolderGit2 className="h-3.5 w-3.5 text-primary" />
            Código fonte (GitHub)
          </Label>
          <span className="text-[11px] text-muted-foreground">
            {repos.length} {repos.length === 1 ? "repositório" : "repositórios"}
          </span>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-3.5">
          {repos.map((repo, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-xl border border-border/40 bg-card/80 p-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">Tipo:</span>
                  {PRESET_LABELS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleRepoChange(idx, "nome", preset)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                        repo.nome.toLowerCase() === preset.toLowerCase()
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {repos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRepo(idx)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    title="Remover este repositório"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  type="text"
                  placeholder="Nome (ex: API, Web)"
                  value={repo.nome}
                  onChange={(e) => handleRepoChange(idx, "nome", e.target.value)}
                  className="h-9 rounded-xl sm:col-span-1 text-xs"
                />
                <Input
                  id={idx === 0 ? "link-github" : `link-github-${idx}`}
                  type="url"
                  placeholder="https://github.com/org/repo"
                  value={repo.url}
                  onChange={(e) => handleRepoChange(idx, "url", e.target.value)}
                  className="h-9 rounded-xl sm:col-span-2 text-xs"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRepo}
            className="w-full rounded-xl border-dashed border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar outro repositório (Frontend / Backend / Mobile)
          </Button>
        </div>
      </div>

      {/* Demais Ferramentas */}
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
