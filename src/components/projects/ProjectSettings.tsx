import { motion } from "framer-motion";
import { AlertTriangle, Link2, Lock, Pencil, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WorkspaceLinksForm } from "@/components/projects/WorkspaceLinksForm";
import type { ProjectDetail } from "@/services/projectDetail";

/**
 * ProjectSettings (ETAPA 18 da refatoração UI/UX) — Privacidade + Links +
 * Encerrar. Extraído de src/routes/projetos.$id.tsx para reduzir a
 * complexidade da rota sem alterar a lógica: updatePrivacy otimista,
 * updateLinks, WorkspaceLinksForm, toasts e âncoras
 * (secao-settings-privacidade / secao-settings-links) preservados.
 * Renderiza apenas para o dono (mesmo guarda que a rota tinha).
 */
export function ProjectSettings({
  data,
  isOwner,
  updatePrivacy,
  updateLinks,
  closing,
  onCloseProject,
}: ProjectSettingsProps) {
  if (!isOwner) return null;

  return (
    <section id="secao-settings" className="scroll-mt-16 space-y-6">
      <div className="flex items-center gap-2 pt-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-bold text-foreground">Configurações do projeto</h2>
      </div>

      {/* Privacidade */}
      <motion.div
        id="secao-settings-privacidade"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="scroll-mt-16"
      >
        <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-bold text-foreground">Privacidade</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Controle quem vê o projeto e se as entregas do squad aparecem no portfólio público dos
              membros.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="privacidade-visibilidade">Visibilidade</Label>
                <Select
                  value={data.visibilidade ?? "publico"}
                  onValueChange={(value) =>
                    updatePrivacy.mutate({
                      visibilidade: value as "publico" | "privado",
                    })
                  }
                >
                  <SelectTrigger id="privacidade-visibilidade" className="w-full cursor-pointer">
                    <SelectValue placeholder="Selecione a visibilidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">Público</SelectItem>
                    <SelectItem value="privado">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3.5">
                <div className="space-y-0.5">
                  <Label htmlFor="permitir-portfolio-publico" className="text-xs font-semibold">
                    Permitir portfólio público
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Se desativado, o projeto aparece sem detalhes técnicos no portfólio dos membros.
                  </p>
                </div>
                <Switch
                  id="permitir-portfolio-publico"
                  checked={data.permitirPortfolioPublico ?? true}
                  onCheckedChange={(checked) =>
                    updatePrivacy.mutate({ permitirPortfolioPublico: checked })
                  }
                  className="scale-95 cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Links de trabalho do squad */}
      <motion.div
        id="secao-settings-links"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="scroll-mt-16"
      >
        <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-bold text-foreground">Links de trabalho do squad</h2>
              {isOwner && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-7 gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar links
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Links de trabalho do squad</DialogTitle>
                      <DialogDescription>
                        Atualize os links usados pelo time (GitHub, Figma, comunicação e
                        documentação). Deixe vazio para remover.
                      </DialogDescription>
                    </DialogHeader>
                    <WorkspaceLinksForm
                      initial={{
                        repositorioUrl: data.repositorioUrl ?? "",
                        figmaUrl: data.figmaUrl ?? "",
                        discordUrl: data.discordUrl ?? "",
                        documentacaoUrl: data.documentacaoUrl ?? "",
                      }}
                      submitting={updateLinks.isPending}
                      onSave={(links) => updateLinks.mutate(links)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Os links configurados aparecem em formato compacto no topo da página para os membros
              do squad.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Encerrar projeto */}
      {data.status !== "Finalizado" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="rounded-3xl border border-destructive/20 bg-card shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="text-base font-bold text-foreground">Encerrar projeto</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Encerra o projeto e o mantém listado com o status "Finalizado". Esta ação não pode
                ser desfeita.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10"
                onClick={onCloseProject}
                disabled={closing}
              >
                {closing ? "Encerrando..." : "Encerrar Projeto"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </section>
  );
}

type ProjectSettingsProps = {
  data: ProjectDetail;
  isOwner: boolean;
  /** Mutation de privacidade (updatePrivacy da rota) — otimista, com rollback e toasts. */
  updatePrivacy: {
    mutate: (changes: {
      visibilidade?: "publico" | "privado";
      permitirPortfolioPublico?: boolean;
    }) => void;
  };
  /** Mutation de links de trabalho (updateLinks da rota) — toasts e invalidação. */
  updateLinks: {
    isPending: boolean;
    mutate: (links: {
      repositorioUrl?: string;
      figmaUrl?: string;
      discordUrl?: string;
      documentacaoUrl?: string;
    }) => void;
  };
  closing: boolean;
  onCloseProject: () => void;
};
