import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, X, Github } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ReputationOverview } from "@/components/profile/ReputationOverview";
import { Achievements } from "@/components/profile/Achievements";
import { ProjectHistory } from "@/components/profile/ProjectHistory";
import { Reviews } from "@/components/profile/Reviews";
import { fetchReputation } from "@/services/reputation";

function PerfilPage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: reputation, isLoading: loadingRep } = useQuery({
    queryKey: ["reputation", user?.id ?? user?.email],
    queryFn: () => fetchReputation(user?.id),
  });

  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MS";

  function addSkill(value: string) {
    const v = value.trim();
    if (!v || skills.includes(v)) return;
    setSkills((arr) => [...arr, v]);
    setDraft("");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const next = { ...user, name, bio, location, skills };
      updateUser(next);
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Perfil atualizado");
    } finally {
      setSaving(false);
    }
  }

  const [importing, setImporting] = useState(false);

  async function handleGithubImport() {
    const username = window.prompt("Digite seu nome de usuário do GitHub:");
    if (!username || !username.trim()) return;

    setImporting(true);
    const toastId = toast.loading("Buscando dados no GitHub...");
    try {
      const userRes = await fetch(`https://api.github.com/users/${username.trim()}`);
      if (!userRes.ok) throw new Error("Usuário não encontrado");
      const userData = await userRes.json();

      setName(userData.name || userData.login || name);
      if (userData.bio) setBio(userData.bio);
      if (userData.location) setLocation(userData.location);

      const reposRes = await fetch(
        `https://api.github.com/users/${username.trim()}/repos?per_page=50&sort=updated`,
      );
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        if (Array.isArray(reposData)) {
          const langs = new Set<string>();
          reposData.forEach((repo: { language?: string | null }) => {
            if (repo.language && typeof repo.language === "string") {
              langs.add(repo.language);
            }
          });
          if (langs.size > 0) {
            setSkills((prev) => Array.from(new Set([...prev, ...Array.from(langs)])));
          }
        }
      }
      toast.success("Dados do GitHub importados!", { id: toastId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao importar dados";
      toast.error(msg, { id: toastId });
    } finally {
      setImporting(false);
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto w-full max-w-4xl space-y-6 py-2">
          <div className="space-y-1">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Você</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Meu perfil</h1>
          </div>

          <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
            <div className="h-32 bg-gradient-to-r from-primary/80 to-indigo-600/80" />
            <CardContent className="-mt-12 space-y-4 p-6 sm:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 text-center sm:text-left justify-between">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <Avatar className="mx-auto sm:mx-0 h-24 w-24 border-4 border-background shadow-md">
                    <AvatarFallback className="bg-gradient-to-tr from-primary/10 to-primary/20 text-xl font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 pb-2">
                    <p className="truncate text-xl font-bold text-foreground">{name}</p>
                    <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="shrink-0 pb-2">
                  <Button
                    onClick={handleGithubImport}
                    disabled={importing}
                    variant="outline"
                    className="rounded-xl flex items-center gap-1.5 h-9 text-xs border-border/60 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                  >
                    <Github className="h-4 w-4" />
                    {importing ? "Importando..." : "Importar do GitHub"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingRep || !reputation ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : (
            <ReputationOverview reputation={reputation} />
          )}

          <Tabs defaultValue="sobre" className="space-y-6">
            <TabsList className="flex w-full justify-start overflow-x-auto rounded-2xl bg-card/45 border border-border/40 p-1 backdrop-blur-sm">
              <TabsTrigger value="sobre" className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer">
                Sobre
              </TabsTrigger>
              <TabsTrigger value="historico" className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer">
                Histórico
              </TabsTrigger>
              <TabsTrigger value="avaliacoes" className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer">
                Avaliações
              </TabsTrigger>
              <TabsTrigger value="conquistas" className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer">
                Conquistas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sobre">
              <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
                <CardContent className="space-y-6 p-6 sm:p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="name"
                        className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                      >
                        Nome completo
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 rounded-xl border border-border/60 bg-background px-4 focus-visible:ring-primary/20 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="location"
                        className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                      >
                        Localização
                      </Label>
                      <Input
                        id="location"
                        placeholder="São Paulo, BR"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="h-11 rounded-xl border border-border/60 bg-background px-4 focus-visible:ring-primary/20 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="bio"
                      className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                    >
                      Biografia
                    </Label>
                    <Textarea
                      id="bio"
                      rows={3}
                      placeholder="Conte um pouco sobre você, sua stack e o que gosta de construir."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="rounded-xl border border-border/60 bg-background p-4 focus-visible:ring-primary/20 text-sm resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                      Suas Habilidades (Skills)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill(draft);
                          }
                        }}
                        placeholder="React, Node.js, Figma... (Pressione Enter para adicionar)"
                        className="h-11 rounded-xl border border-border/60 bg-background px-4 focus-visible:ring-primary/20 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addSkill(draft)}
                        className="h-11 w-11 rounded-xl border border-border/60 flex items-center justify-center shrink-0 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide border border-border bg-muted/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all flex items-center gap-1"
                            onClick={() => setSkills((arr) => arr.filter((x) => x !== s))}
                            title="Clique para remover"
                          >
                            {s}
                            <X className="ml-1 h-3 w-3 shrink-0" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/20">
                    <Button
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl px-6 text-xs font-semibold shadow-sm cursor-pointer"
                    >
                      {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      Salvar alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico">
              {loadingRep || !reputation ? (
                <Skeleton className="h-48 w-full rounded-2xl" />
              ) : (
                <ProjectHistory items={reputation.history} />
              )}
            </TabsContent>

            <TabsContent value="avaliacoes">
              {loadingRep || !reputation ? (
                <Skeleton className="h-48 w-full rounded-2xl" />
              ) : (
                <Reviews items={reputation.reviews} />
              )}
            </TabsContent>

            <TabsContent value="conquistas">
              {loadingRep || !reputation ? (
                <Skeleton className="h-48 w-full rounded-2xl" />
              ) : (
                <Achievements items={reputation.achievements} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});
