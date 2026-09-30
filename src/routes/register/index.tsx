import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Github, Loader2, Plus, Search, X } from "lucide-react";
import axios from "axios";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getGithubAuthUrl } from "@/services/githubAuth";
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

export const POPULAR_SKILLS = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "Docker",
  "SQL",
  "UI/UX",
  "DevOps",
];

export const DEFAULT_SKILLS = [
  // Frontend
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "TypeScript",
  "JavaScript",
  "HTML/CSS",
  "Tailwind CSS",
  // Backend
  "Node.js",
  "Python",
  "Java",
  "C#",
  "Go",
  "PHP",
  "Ruby",
  "Rust",
  "Spring Boot",
  ".NET",
  // Mobile
  "Flutter",
  "React Native",
  "Kotlin",
  "Swift",
  // Dados & Banco
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  // DevOps & Cloud
  "Docker",
  "Kubernetes",
  "DevOps",
  "AWS",
  "Azure",
  "GCP",
  "Linux",
  "CI/CD",
  // Design, QA & Gestão
  "UI/UX",
  "Figma",
  "QA",
  "Scrum",
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

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  location: z.string().max(80).optional().or(z.literal("")),
  skills: z.array(z.string()).min(1, "Selecione ao menos 1 habilidade"),
});
type FormValues = z.infer<typeof schema>;

function RegisterPage() {
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [availableSkills, setAvailableSkills] = useState<string[]>(DEFAULT_SKILLS);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillPopoverOpen, setSkillPopoverOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, isLoading, navigate]);

  /** Continua com GitHub: busca a URL de autorização e redireciona o navegador. */
  const handleGithubRegister = async () => {
    setGithubLoading(true);
    try {
      const { url } = await getGithubAuthUrl();
      window.location.href = url;
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? ((err.response.data as { message?: string }).message ??
            "Não foi possível conectar com o GitHub")
          : "Não foi possível conectar com o GitHub";
      toast.error(message);
      setGithubLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { skills: [] },
  });

  const locationValue = watch("location");

  useEffect(() => {
    if (!locationOpen) {
      setLocationSearch(locationValue || "");
    }
  }, [locationValue, locationOpen]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const loggedIn = await signUp(values);
      toast.success("Conta criada com sucesso!");
      navigate({ to: loggedIn ? "/dashboard" : "/login" });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? ((err.response.data as { message?: string }).message ?? "Não foi possível registrar")
          : "Não foi possível registrar";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Monte seu perfil e comece a participar de squads."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl font-medium shadow-sm"
          disabled={submitting || githubLoading}
          onClick={handleGithubRegister}
        >
          {githubLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          Continuar com GitHub
        </Button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border/60" />
          <span className="text-xs text-muted-foreground">ou crie com e-mail</span>
          <span className="h-px flex-1 bg-border/60" />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="name"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Nome completo
          </Label>
          <Input
            id="name"
            placeholder="Seu nome"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@exemplo.com"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="location"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Localização (Estado)
          </Label>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <Popover
                open={locationOpen}
                onOpenChange={(open) => {
                  setLocationOpen(open);
                  if (!open) {
                    setLocationSearch(field.value || "");
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
                          field.onChange("");
                        }
                      }}
                      onFocus={() => setLocationOpen(true)}
                      onClick={() => setLocationOpen(true)}
                      placeholder="Selecione seu estado..."
                      className="h-11 w-full rounded-xl border border-border/60 bg-background/40 px-4 pr-10 focus-visible:ring-primary/20 text-sm"
                    />
                    <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) p-0 rounded-2xl border border-border/60 shadow-lg bg-card"
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
                                  field.onChange(st.label);
                                  setLocationSearch(st.label);
                                  setLocationOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === st.label ? "opacity-100" : "opacity-0",
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
            )}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
            Habilidades (Skills)
          </Label>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => {
              const selectedSkills: string[] = field.value || [];

              const handleAddSkill = (skillToAdd: string) => {
                const trimmed = skillToAdd.trim();
                if (!trimmed) return;
                const already = selectedSkills.some(
                  (s) => s.toLowerCase() === trimmed.toLowerCase(),
                );
                if (!already) {
                  field.onChange([...selectedSkills, trimmed]);
                }
                setSkillSearch("");
                setSkillPopoverOpen(false);
              };

              const handleRemoveSkill = (skillToRemove: string) => {
                field.onChange(selectedSkills.filter((s) => s !== skillToRemove));
              };

              const filteredSuggestions = availableSkills.filter(
                (s) =>
                  normalizeText(s).includes(normalizeText(skillSearch)) &&
                  !selectedSkills.some((sel) => sel.toLowerCase() === s.toLowerCase()),
              );

              return (
                <div className="space-y-2.5">
                  {/* Chips das Skills Selecionadas com botão X para remover */}
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-background/50 border border-border/50 min-h-[38px] items-center">
                      {selectedSkills.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-primary text-primary-foreground pl-2.5 pr-1 py-1 text-xs rounded-full flex items-center gap-1 shadow-sm font-medium transition-all"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="rounded-full hover:bg-primary-foreground/20 p-0.5 text-primary-foreground transition-colors cursor-pointer"
                            title={`Remover ${skill}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Input de Busca com Autocomplete */}
                  <Popover open={skillPopoverOpen} onOpenChange={setSkillPopoverOpen}>
                    <PopoverAnchor asChild>
                      <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="skill-search"
                          value={skillSearch}
                          onChange={(e) => {
                            setSkillSearch(e.target.value);
                            setSkillPopoverOpen(true);
                          }}
                          onFocus={() => setSkillPopoverOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (skillSearch.trim()) {
                                const exact = filteredSuggestions.find(
                                  (s) => s.toLowerCase() === skillSearch.trim().toLowerCase(),
                                );
                                handleAddSkill(exact || skillSearch.trim());
                              }
                            }
                          }}
                          placeholder="Buscar habilidade (ex: TypeScript, Java, C#...)"
                          className="h-11 w-full rounded-xl border border-border/60 bg-background/40 pl-10 pr-10 focus-visible:ring-primary/20 text-sm"
                        />
                        {skillSearch && (
                          <button
                            type="button"
                            onClick={() => setSkillSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </PopoverAnchor>
                    <PopoverContent
                      className="w-(--radix-popover-trigger-width) p-0 rounded-2xl border border-border/60 shadow-lg bg-card"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onInteractOutside={(e) => {
                        if (e.target === document.getElementById("skill-search")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <Command>
                        <CommandList>
                          {filteredSuggestions.length === 0 ? (
                            <div className="p-3 text-center">
                              <p className="text-xs text-muted-foreground mb-2">
                                Nenhuma habilidade encontrada na lista.
                              </p>
                              {skillSearch.trim() && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleAddSkill(skillSearch)}
                                  className="text-xs h-8 rounded-lg w-full cursor-pointer"
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar "
                                  {skillSearch.trim()}"
                                </Button>
                              )}
                            </div>
                          ) : (
                            <CommandGroup className="max-h-56 overflow-y-auto">
                              {filteredSuggestions.slice(0, 20).map((skill) => (
                                <CommandItem
                                  key={skill}
                                  value={skill}
                                  onSelect={() => handleAddSkill(skill)}
                                  className="cursor-pointer text-xs py-2 px-3 flex items-center justify-between"
                                >
                                  <span>{skill}</span>
                                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                </CommandItem>
                              ))}
                              {skillSearch.trim() &&
                                !filteredSuggestions.some(
                                  (s) => s.toLowerCase() === skillSearch.trim().toLowerCase(),
                                ) && (
                                  <CommandItem
                                    value={skillSearch}
                                    onSelect={() => handleAddSkill(skillSearch)}
                                    className="cursor-pointer text-xs py-2 px-3 text-primary font-medium border-t border-border/40"
                                  >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar "
                                    {skillSearch.trim()}"
                                  </CommandItem>
                                )}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Sugestões Rápidas / Tags Populares */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Sugeridas populares:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SKILLS.map((popSkill) => {
                        const isSelected = selectedSkills.some(
                          (s) => s.toLowerCase() === popSkill.toLowerCase(),
                        );
                        return (
                          <button
                            key={popSkill}
                            type="button"
                            disabled={isSelected}
                            onClick={() => handleAddSkill(popSkill)}
                            className="outline-none disabled:opacity-40"
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-normal transition-all border",
                                isSelected
                                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                                  : "bg-background/20 border-border/70 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                              )}
                            >
                              + {popSkill}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }}
          />
          {errors.skills && <p className="text-xs text-destructive">{errors.skills.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold shadow-md mt-2"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/register/")({
  component: RegisterPage,
});
