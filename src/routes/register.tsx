import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Github, Loader2 } from "lucide-react";
import axios from "axios";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const SKILLS = ["React", "Node.js", "Python", "Docker", "UI/UX", "DevOps"] as const;

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
  bio: z.string().max(280).optional().or(z.literal("")),
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

        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-1.5">
            <Label
              htmlFor="bio"
              className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
            >
              Bio curta
            </Label>
            <Input
              id="bio"
              placeholder="Curta sobre você"
              className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
              {...register("bio")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
            Habilidades (Skills)
          </Label>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 pt-1">
                {SKILLS.map((skill) => {
                  const active = field.value.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          active ? field.value.filter((s) => s !== skill) : [...field.value, skill],
                        )
                      }
                      className="outline-none"
                    >
                      <Badge
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer rounded-full px-3 py-1 text-xs transition-all font-medium border shadow-sm",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background/40 border-border/80 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                        )}
                      >
                        {skill}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
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

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});
