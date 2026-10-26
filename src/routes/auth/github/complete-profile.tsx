import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type User } from "@/contexts/AuthContext";
import { completeGithubProfile, type GithubAuthUser } from "@/services/githubAuth";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  bio: z.string().max(280).optional().or(z.literal("")),
  localizacao: z.string().max(80).optional().or(z.literal("")),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(72).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function mapGithubUser(dados: GithubAuthUser): User {
  return {
    id: String(dados.id),
    name: dados.nome,
    email: dados.email,
    bio: dados.bio ?? undefined,
    location: dados.localizacao ?? undefined,
    avatarUrl: dados.avatar_url ?? undefined,
    role: dados.tipo === "adm" ? "admin" : "user",
  };
}

/**
 * Lê o token do fragment (#token=...) — prioritário, pois não vaza via
 * Referer/histórico/logs — com fallback para a query string (?token=...) por
 * compatibilidade. Ao ler do fragment, limpa a URL (history.replaceState) para
 * o token não ficar registrado no histórico do navegador.
 */
function readTokenFromHash(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hash = window.location.hash;
  if (!hash) return undefined;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return token;
  }
  return undefined;
}

function GithubCompleteProfilePage() {
  // /auth/github/complete-profile#token=... (ou ?token=... por compatibilidade)
  // — usuário recém criado via GitHub: precisa completar o perfil antes de
  // acessar a plataforma (onboarding).
  const search = useSearch({ strict: false }) as { token?: string };
  const queryToken = typeof search?.token === "string" ? search.token : undefined;
  const [token, setToken] = useState<string | undefined>(queryToken);
  const [resolved, setResolved] = useState(false);

  const { persistSession } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hashToken = readTokenFromHash();
    if (hashToken) setToken(hashToken);
    setResolved(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { token: novoToken, dados } = await completeGithubProfile(
        {
          nome: values.nome,
          bio: values.bio || undefined,
          localizacao: values.localizacao || undefined,
          senha: values.senha || undefined,
        },
        token,
      );
      persistSession(novoToken, mapGithubUser(dados));
      toast.success("Perfil completo! Bem-vindo(a) ao MontesSquad.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível completar seu perfil.";
      toast.error(message);
      setSubmitting(false);
    }
  };

  if (!resolved) {
    return (
      <AuthLayout title="Carregando..." subtitle="Preparando seu cadastro com GitHub.">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!token) {
    return (
      <AuthLayout
        title="Link inválido ou expirado"
        subtitle="Não foi possível completar seu cadastro com GitHub."
        footer={
          <>
            Já tem conta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </>
        }
      >
        <div className="space-y-5 text-center">
          <p className="text-sm text-muted-foreground">
            O token de autenticação está ausente ou expirou. Tente se cadastrar novamente com o
            GitHub.
          </p>
          <Button asChild className="h-11 w-full rounded-xl font-semibold shadow-md">
            <Link to="/login">Ir para o login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Completar perfil"
      subtitle="Quase lá! Complete seus dados para começar a montar squads."
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
        <div className="space-y-1.5">
          <Label
            htmlFor="nome"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Nome completo
          </Label>
          <Input
            id="nome"
            placeholder="Seu nome"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("nome")}
          />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="localizacao"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Localização (Estado)
          </Label>
          <Input
            id="localizacao"
            placeholder="Ex.: SP"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("localizacao")}
          />
          {errors.localizacao && (
            <p className="text-xs text-destructive">{errors.localizacao.message}</p>
          )}
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
          {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="senha"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Senha (opcional)
          </Label>
          <Input
            id="senha"
            type="password"
            placeholder="Defina uma senha para acessar sem GitHub"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("senha")}
          />
          {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
          <p className="text-xs text-muted-foreground">
            Opcional — permite entrar com e-mail/senha mesmo sem o GitHub.
          </p>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold shadow-md mt-2"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir cadastro"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/auth/github/complete-profile")({
  component: GithubCompleteProfilePage,
});
