import { useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, X, Github, Check, ChevronsUpDown } from "lucide-react";
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
import { fetchReputation, type Reputation } from "@/services/reputation";
import { updateUserProfile, syncUserSkills } from "@/services/perfil";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

const POPULAR_TECHS = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "Docker",
  "Figma",
  "UI/UX",
  "DevOps",
  "Java",
  "C#",
  "SQL",
];

const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre - AC" },
  { value: "AL", label: "Alagoas - AL" },
  { value: "AP", label: "Amapá - AP" },
  { value: "AM", label: "Amazonas - AM" },
  { value: "BA", label: "Bahia - BA" },
  { value: "CE", label: "Ceará - CE" },
  { value: "DF", label: "Distrito Federal - DF" },
  { value: "ES", label: "Espírito Santo - ES" },
  { value: "GO", label: "Goiás - GO" },
  { value: "MA", label: "Maranhão - MA" },
  { value: "MT", label: "Mato Grosso - MT" },
  { value: "MS", label: "Mato Grosso do Sul - MS" },
  { value: "MG", label: "Minas Gerais - MG" },
  { value: "PA", label: "Pará - PA" },
  { value: "PB", label: "Paraíba - PB" },
  { value: "PR", label: "Paraná - PR" },
  { value: "PE", label: "Pernambuco - PE" },
  { value: "PI", label: "Piauí - PI" },
  { value: "RJ", label: "Rio de Janeiro - RJ" },
  { value: "RN", label: "Rio Grande do Norte - RN" },
  { value: "RS", label: "Rio Grande do Sul - RS" },
  { value: "RO", label: "Rondônia - RO" },
  { value: "RR", label: "Roraima - RR" },
  { value: "SC", label: "Santa Catarina - SC" },
  { value: "SP", label: "São Paulo - SP" },
  { value: "SE", label: "Sergipe - SE" },
  { value: "TO", label: "Tocantins - TO" },
];

const normalizeText = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Estado de carregamento/erro/vazio da seção de reputação.
 * Com a integração real (GET /usuarios/me/reputacao), falhas não mostram
 * dados fictícios: exibem mensagem + ação de tentar novamente.
 */
function ReputationState({
  data,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  skeletonClass,
  render,
}: {
  data: Reputation | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  skeletonClass: string;
  render: (rep: Reputation) => ReactNode;
}) {
  if (isLoading) return <Skeleton className={skeletonClass} />;

  if (isError) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm font-semibold text-foreground">
          Não foi possível carregar sua reputação
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{errorMessage}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 cursor-pointer"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Sem dados de reputação</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Sua reputação ainda não foi calculada. Continue participando de squads para acumular
          XP e avaliações!
        </p>
      </div>
    );
  }

  return <>{render(data)}</>;
}

function PerfilPage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState(user?.location ?? "");

  useEffect(() => {
    if (!locationOpen) {
      setLocationSearch(location);
    }
  }, [location, locationOpen]);

  const {
    data: reputation,
    isLoading: loadingRep,
    isError: reputationError,
    error: reputationErrorObj,
    refetch: refetchReputation,
  } = useQuery({
    queryKey: ["reputation", user?.id ?? user?.email],
    queryFn: () => fetchReputation(user?.id),
  });

  const reputationErrorMessage =
    reputationErrorObj instanceof Error
      ? reputationErrorObj.message
      : "Tente novamente em instantes.";

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
      // 1) Persiste o perfil no backend (PATCH /usuarios/:id)
      await updateUserProfile({ nome: name, bio, localizacao: location });

      // 2) Só atualiza o estado local depois da resposta 200 da API
      const next = { ...user, name, bio, location, skills };
      updateUser(next);

      // 3) Persiste as habilidades (best-effort: perfil já foi salvo)
      try {
        const { added, skipped } = await syncUserSkills(skills);
        let message = "Perfil atualizado";
        if (added > 0) {
          message = `Perfil atualizado com ${added} habilidade(s)`;
        }
        if (skipped.length > 0) {
          message += ` — ${skipped.length} habilidade(s) não encontrada(s) na base global e foram ignoradas`;
        }
        toast.success(message);
      } catch (skillsErr) {
        console.warn("[perfil] Falha ao sincronizar habilidades:", skillsErr);
        toast.warning("Perfil salvo, mas não foi possível sincronizar as habilidades.");
      }
    } catch (err) {
      // Não finge sucesso: não atualiza o estado local
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar perfil. Tente novamente.";
      toast.error(msg);
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

          <ReputationState
            data={reputation}
            isLoading={loadingRep}
            isError={reputationError}
            errorMessage={reputationErrorMessage}
            onRetry={() => refetchReputation()}
            skeletonClass="h-24 w-full rounded-2xl"
            render={(rep) => <ReputationOverview reputation={rep} />}
          />

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
                    <div className="space-y-1.5 flex flex-col">
                      <Label
                        htmlFor="location"
                        className="text-xs font-semibold text-foreground/80 tracking-wide uppercase mb-1"
                      >
                        Localização (Estado)
                      </Label>
                      <Popover
                        open={locationOpen}
                        onOpenChange={(open) => {
                          setLocationOpen(open);
                          if (!open) {
                            setLocationSearch(location);
                          }
                        }}
                      >
                        <PopoverAnchor asChild>
                          <div className="relative w-full">
                            <Input
                              id="location"
                              value={locationSearch}
                              onChange={(e) => {
                                setLocationSearch(e.target.value);
                                setLocationOpen(true);
                                if (!e.target.value) {
                                  setLocation("");
                                }
                              }}
                              onFocus={() => setLocationOpen(true)}
                              onClick={() => setLocationOpen(true)}
                              placeholder="Selecione seu estado..."
                              className="h-11 w-full rounded-xl border border-border/60 bg-background px-4 pr-10 focus-visible:ring-primary/20 text-sm"
                            />
                            <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                          </div>
                        </PopoverAnchor>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border border-border/60 shadow-lg bg-card"
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          onInteractOutside={(e) => {
                            if (e.target === document.getElementById("location")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <Command>
                            <CommandList>
                              {(() => {
                                const filtered = BRAZILIAN_STATES.filter((st) =>
                                  normalizeText(st.label).includes(normalizeText(locationSearch))
                                );
                                if (filtered.length === 0) {
                                  return (
                                    <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                                      Nenhum estado encontrado.
                                    </CommandEmpty>
                                  );
                                }
                                return (
                                  <CommandGroup className="max-h-60 overflow-y-auto">
                                    {filtered.map((st) => (
                                      <CommandItem
                                        key={st.value}
                                        value={st.label}
                                        onSelect={() => {
                                          setLocation(st.label);
                                          setLocationSearch(st.label);
                                          setLocationOpen(false);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            location === st.label ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {st.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                );
                              })()}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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

                    {/* Sugestões Rápidas */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {POPULAR_TECHS.map((t) => {
                        const isAdded = skills.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={isAdded}
                            onClick={() => addSkill(t)}
                            className="outline-none disabled:opacity-50"
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] transition-all font-medium border",
                                isAdded
                                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                                  : "bg-background/20 border-border/80 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                              )}
                            >
                              + {t}
                            </Badge>
                          </button>
                        );
                      })}
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
              <ReputationState
                data={reputation}
                isLoading={loadingRep}
                isError={reputationError}
                errorMessage={reputationErrorMessage}
                onRetry={() => refetchReputation()}
                skeletonClass="h-48 w-full rounded-2xl"
                render={(rep) => <ProjectHistory items={rep.history} />}
              />
            </TabsContent>

            <TabsContent value="avaliacoes">
              <ReputationState
                data={reputation}
                isLoading={loadingRep}
                isError={reputationError}
                errorMessage={reputationErrorMessage}
                onRetry={() => refetchReputation()}
                skeletonClass="h-48 w-full rounded-2xl"
                render={(rep) => <Reviews items={rep.reviews} />}
              />
            </TabsContent>

            <TabsContent value="conquistas">
              <ReputationState
                data={reputation}
                isLoading={loadingRep}
                isError={reputationError}
                errorMessage={reputationErrorMessage}
                onRetry={() => refetchReputation()}
                skeletonClass="h-48 w-full rounded-2xl"
                render={(rep) => <Achievements items={rep.achievements} />}
              />
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
