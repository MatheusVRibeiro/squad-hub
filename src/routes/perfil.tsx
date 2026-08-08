import { useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, X, Github, Check, ChevronsUpDown, Target } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { fetchMe } from "@/services/perfil";
import {
  getFuncoes,
  getMeuPerfilTecnico,
  atualizarPerfilTecnico,
  salvarFuncoes,
  salvarHabilidadesComNivel,
  type Funcao,
  type NivelHabilidade,
  type NivelInteresse,
} from "@/services/perfilTecnico";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

type SkillComNivel = { nome: string; nivel: NivelHabilidade };
type FuncaoInteresse = { nome: string; nivel_interesse: NivelInteresse };

/** Fallback offline das 9 funções (ETAPA 3) — a lista real vem de GET /funcoes. */
const FUNCOES_PADRAO: Funcao[] = [
  { id: 1, nome: "Backend" },
  { id: 2, nome: "Frontend" },
  { id: 3, nome: "Full Stack" },
  { id: 4, nome: "Mobile" },
  { id: 5, nome: "QA" },
  { id: 6, nome: "DevOps" },
  { id: 7, nome: "UX/UI" },
  { id: 8, nome: "Data" },
  { id: 9, nome: "Product" },
];

const NIVEIS_HABILIDADE: { value: NivelHabilidade; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

const NIVEIS_INTERESSE: { value: NivelInteresse; label: string }[] = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

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
          Sua reputação ainda não foi calculada. Continue participando de squads para acumular XP e
          avaliações!
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
  const [avatar, setAvatar] = useState(user?.avatarUrl ?? "");
  const [skills, setSkills] = useState<SkillComNivel[]>(
    (user?.skills ?? []).map((s) => ({ nome: s, nivel: "iniciante" })),
  );
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState(user?.location ?? "");

  // ETAPA 3 — perfil técnico (funções, disponibilidade, objetivo, perfil_completo)
  const [funcoesDisponiveis, setFuncoesDisponiveis] = useState<Funcao[]>(FUNCOES_PADRAO);
  const [funcoesInteresse, setFuncoesInteresse] = useState<FuncaoInteresse[]>([]);
  const [disponibilidade, setDisponibilidade] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [perfilCompleto, setPerfilCompleto] = useState<boolean | null>(null);
  const [perfilTecnicoCarregado, setPerfilTecnicoCarregado] = useState(false);

  // Opção B (fix B12): busca os dados frescos do usuário no BACKEND ao montar
  // a página — o formulário nunca depende apenas do localStorage, então um
  // user corrompido (ex: nome "") não sobrescreve campos reais no salvar.
  // ETAPA 3 — carrega o perfil técnico completo (GET /usuarios/me/perfil) e a
  // lista de funções (GET /funcoes). Se o backend ainda não expõe o endpoint
  // (fallback), usa GET /usuarios/me como antes — o formulário continua editável.
  useEffect(() => {
    let ativo = true;

    getFuncoes()
      .then((funcoes) => {
        if (ativo && funcoes.length > 0) setFuncoesDisponiveis(funcoes);
      })
      .catch((err) => {
        console.warn("[perfil] Não foi possível carregar a lista de funções:", err);
      });

    getMeuPerfilTecnico()
      .then((perfil) => {
        if (!ativo) return;
        setName(perfil.nome || "");
        setBio(perfil.bio ?? "");
        setLocation(perfil.localizacao ?? "");
        setAvatar(perfil.avatar_url ?? "");
        setSkills((perfil.habilidades ?? []).map((h) => ({ nome: h.nome, nivel: h.nivel })));
        setFuncoesInteresse(
          (perfil.funcoes ?? []).map((f) => ({ nome: f.nome, nivel_interesse: f.nivel_interesse })),
        );
        setDisponibilidade(
          perfil.disponibilidade_horas_semana != null
            ? String(perfil.disponibilidade_horas_semana)
            : "",
        );
        setObjetivo(perfil.objetivo_profissional ?? "");
        setPerfilCompleto(perfil.perfil_completo);
      })
      .catch((err) => {
        // Backend ETAPA 3 ainda não disponível: fallback para os dados básicos.
        if (!ativo) return;
        console.warn("[perfil] Perfil técnico ainda não disponível; usando fallback:", err);
        fetchMe()
          .then((dados) => {
            if (!ativo) return;
            setName((prev) => prev || dados.nome || "");
            setBio((prev) => prev || dados.bio || "");
            setLocation((prev) => prev || dados.localizacao || "");
            setAvatar((prev) => prev || dados.avatar_url || "");
          })
          .catch((err2) => {
            if (!ativo) return;
            console.warn("[perfil] Não foi possível carregar dados do backend:", err2);
          });
      })
      .finally(() => {
        if (ativo) setPerfilTecnicoCarregado(true);
      });

    return () => {
      ativo = false;
    };
  }, []);

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
    if (!v || skills.some((s) => s.nome === v)) return;
    setSkills((arr) => [...arr, { nome: v, nivel: "iniciante" }]);
    setDraft("");
  }

  function removerSkill(nome: string) {
    setSkills((arr) => arr.filter((s) => s.nome !== nome));
  }

  function mudarNivelSkill(nome: string, nivel: NivelHabilidade) {
    setSkills((arr) => arr.map((s) => (s.nome === nome ? { ...s, nivel } : s)));
  }

  function toggleFuncao(nome: string) {
    setFuncoesInteresse((arr) =>
      arr.some((f) => f.nome === nome)
        ? arr.filter((f) => f.nome !== nome)
        : [...arr, { nome, nivel_interesse: "medio" }],
    );
  }

  function mudarNivelInteresse(nome: string, nivel: NivelInteresse) {
    setFuncoesInteresse((arr) =>
      arr.map((f) => (f.nome === nome ? { ...f, nivel_interesse: nivel } : f)),
    );
  }

  // Percentual local de completude (espelha o critério do backend para o
  // indicador: nome, bio, localização, objetivo, disponibilidade > 0, ≥1
  // habilidade e ≥1 função).
  const criterios = [
    name.trim().length > 0,
    bio.trim().length > 0,
    location.trim().length > 0,
    objetivo.trim().length > 0,
    Number(disponibilidade) > 0,
    skills.length > 0,
    funcoesInteresse.length > 0,
  ];
  const percentual = Math.round((criterios.filter(Boolean).length / criterios.length) * 100);

  function rolarParaPerfilTecnico() {
    document
      .getElementById("perfil-tecnico")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      // 1) Persiste o perfil técnico no backend (PATCH /usuarios/me/perfil)
      const horas = Number(disponibilidade);
      await atualizarPerfilTecnico({
        nome: name,
        bio,
        localizacao: location,
        avatarUrl: avatar,
        disponibilidade_horas_semana: Number.isFinite(horas) && horas > 0 ? horas : undefined,
        objetivo_profissional: objetivo.trim() || undefined,
      });

      // 2) Só atualiza o estado local depois da resposta 200 da API
      const next = {
        ...user,
        name,
        bio,
        location,
        avatarUrl: avatar,
        skills: skills.map((s) => s.nome),
      };
      updateUser(next);

      // 3) Funções e habilidades com nível (best-effort: perfil já foi salvo)
      let aviso = "";
      try {
        await salvarFuncoes(funcoesInteresse);
      } catch (funcoesErr) {
        aviso = "funções";
        console.warn("[perfil] Falha ao salvar funções de interesse:", funcoesErr);
      }
      try {
        await salvarHabilidadesComNivel(skills);
      } catch (skillsErr) {
        aviso = aviso ? "funções e habilidades" : "habilidades";
        console.warn("[perfil] Falha ao salvar habilidades com nível:", skillsErr);
      }

      if (aviso) {
        toast.warning(`Perfil salvo, mas não foi possível sincronizar ${aviso}.`);
      } else {
        toast.success("Perfil atualizado");
      }
    } catch (err) {
      // Não finge sucesso: não atualiza o estado local
      const msg = err instanceof Error ? err.message : "Erro ao salvar perfil. Tente novamente.";
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
      if (userData.avatar_url) setAvatar(userData.avatar_url);

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
            setSkills((prev) => {
              const nomes = new Set(prev.map((s) => s.nome));
              const novos = Array.from(langs)
                .filter((l) => !nomes.has(l))
                .map((l) => ({ nome: l, nivel: "iniciante" as NivelHabilidade }));
              return [...prev, ...novos];
            });
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
                    {avatar ? (
                      <AvatarImage src={avatar} alt={name || "Avatar"} className="object-cover" />
                    ) : null}
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

          {perfilTecnicoCarregado && perfilCompleto === false && (
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-primary/5 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Complete seu perfil técnico
                    </p>
                  </div>
                  <p className="max-w-lg text-xs text-muted-foreground">
                    Adicione funções de interesse, disponibilidade semanal e nível por tecnologia
                    para aparecer no matching de squads.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <Progress value={percentual} className="h-2 flex-1" />
                    <span className="w-10 text-right text-xs font-semibold text-primary">
                      {percentual}%
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={rolarParaPerfilTecnico}
                  className="shrink-0 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Preencher agora
                </Button>
              </div>
            </div>
          )}

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
              <TabsTrigger
                value="sobre"
                className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Sobre
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Histórico
              </TabsTrigger>
              <TabsTrigger
                value="avaliacoes"
                className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Avaliações
              </TabsTrigger>
              <TabsTrigger
                value="conquistas"
                className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              >
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
                                  normalizeText(st.label).includes(normalizeText(locationSearch)),
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
                                            location === st.label ? "opacity-100" : "opacity-0",
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

                  <div
                    id="perfil-tecnico"
                    className="scroll-mt-24 space-y-6 border-t border-border/20 pt-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h2 className="text-base font-semibold text-foreground">Perfil técnico</h2>
                        <p className="text-xs text-muted-foreground">
                          Funções de interesse, disponibilidade semanal e nível por tecnologia
                          alimentam o matching de squads.
                        </p>
                      </div>
                      {perfilCompleto ? (
                        <Badge className="gap-1 rounded-full border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 shrink-0">
                          <Check className="h-3 w-3" />
                          Perfil completo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-primary shrink-0"
                        >
                          {percentual}% completo
                        </Badge>
                      )}
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
                          const isAdded = skills.some((s) => s.nome === t);
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
                                    : "bg-background/20 border-border/80 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                                )}
                              >
                                + {t}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>

                      {skills.length > 0 && (
                        <div className="mt-2.5 flex flex-col gap-2">
                          {skills.map((s) => (
                            <div
                              key={s.nome}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                            >
                              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                {s.nome}
                              </span>
                              <div className="flex shrink-0 items-center gap-2">
                                <Select
                                  value={s.nivel}
                                  onValueChange={(v) =>
                                    mudarNivelSkill(s.nome, v as NivelHabilidade)
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[132px] rounded-lg text-xs cursor-pointer">
                                    <SelectValue placeholder="Nível" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {NIVEIS_HABILIDADE.map((n) => (
                                      <SelectItem
                                        key={n.value}
                                        value={n.value}
                                        className="cursor-pointer text-xs"
                                      >
                                        {n.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button
                                  type="button"
                                  onClick={() => removerSkill(s.nome)}
                                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  title="Remover habilidade"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                        Funções de interesse
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Selecione as funções que te interessam e o nível de interesse em cada uma.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {funcoesDisponiveis.map((f) => {
                          const selecionada = funcoesInteresse.find((x) => x.nome === f.nome);
                          return selecionada ? (
                            <div
                              key={f.nome}
                              className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-1 pr-1 pl-2.5"
                            >
                              <span className="text-[11px] font-medium text-primary">{f.nome}</span>
                              <Select
                                value={selecionada.nivel_interesse}
                                onValueChange={(v) =>
                                  mudarNivelInteresse(f.nome, v as NivelInteresse)
                                }
                              >
                                <SelectTrigger className="h-6 w-[86px] cursor-pointer rounded-full border-0 bg-transparent px-1.5 text-[10px] [&>svg]:h-3 [&>svg]:w-3">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {NIVEIS_INTERESSE.map((n) => (
                                    <SelectItem
                                      key={n.value}
                                      value={n.value}
                                      className="cursor-pointer text-xs"
                                    >
                                      {n.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => toggleFuncao(f.nome)}
                                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
                                title="Remover função"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              key={f.nome}
                              type="button"
                              onClick={() => toggleFuncao(f.nome)}
                              className="outline-none"
                            >
                              <Badge
                                variant="outline"
                                className="cursor-pointer rounded-full border-border/80 bg-background/20 px-2.5 py-0.5 text-[10px] font-medium transition-all border text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
                              >
                                + {f.nome}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                      {funcoesInteresse.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/70">
                          Nenhuma função selecionada ainda.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="disponibilidade"
                          className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                        >
                          Disponibilidade semanal
                        </Label>
                        <div className="relative">
                          <Input
                            id="disponibilidade"
                            type="number"
                            min={0}
                            max={168}
                            inputMode="numeric"
                            placeholder="Ex.: 20"
                            value={disponibilidade}
                            onChange={(e) => setDisponibilidade(e.target.value)}
                            className="h-11 rounded-xl border border-border/60 bg-background px-4 pr-16 text-sm focus-visible:ring-primary/20"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                            horas/semana
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="objetivo"
                          className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
                        >
                          Objetivo profissional
                        </Label>
                        <Input
                          id="objetivo"
                          maxLength={255}
                          placeholder="Ex.: Evoluir para tech lead em squads de produto"
                          value={objetivo}
                          onChange={(e) => setObjetivo(e.target.value)}
                          className="h-11 rounded-xl border border-border/60 bg-background px-4 text-sm focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>
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
