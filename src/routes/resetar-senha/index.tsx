import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import axios from "axios";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";

const schema = z
  .object({
    novaSenha: z.string().min(6, "Mínimo 6 caracteres").max(72),
    confirmacao: z.string().min(6, "Mínimo 6 caracteres").max(72),
  })
  .refine((values) => values.novaSenha === values.confirmacao, {
    message: "As senhas não conferem",
    path: ["confirmacao"],
  });
type FormValues = z.infer<typeof schema>;

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

function ResetarSenhaPage() {
  const navigate = useNavigate();
  // Lê o token do link recebido por e-mail: /resetar-senha#token=...
  // (fragment — não vaza via Referer/histórico) ou ?token=... (compat).
  const search = useSearch({ strict: false }) as { token?: string };
  const queryToken = typeof search?.token === "string" ? search.token : undefined;
  const [token, setToken] = useState<string | undefined>(queryToken);
  const [resolved, setResolved] = useState(false);

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
      await api.post("/resetar-senha", { token, novaSenha: values.novaSenha });
      toast.success("Senha redefinida com sucesso! Faça login com a nova senha.");
      navigate({ to: "/login" });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? ((err.response.data as { message?: string }).message ??
            "Não foi possível redefinir a senha")
          : "Não foi possível redefinir a senha";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!resolved) {
    return (
      <AuthLayout title="Carregando..." subtitle="Verificando seu link de redefinição.">
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
        subtitle="Não foi possível redefinir sua senha com este link."
        footer={
          <>
            Lembrou a senha?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </>
        }
      >
        <div className="space-y-5 text-center">
          <p className="text-sm text-muted-foreground">
            O link de redefinição está ausente, inválido ou expirou (válido por poucos minutos).
          </p>
          <Button asChild className="h-11 w-full rounded-xl font-semibold shadow-md">
            <Link to="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Definir nova senha"
      subtitle="Escolha uma nova senha para a sua conta."
      footer={
        <>
          Lembrou a senha?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label
            htmlFor="novaSenha"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Nova senha
          </Label>
          <Input
            id="novaSenha"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("novaSenha")}
          />
          {errors.novaSenha && (
            <p className="text-xs text-destructive">{errors.novaSenha.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmacao"
            className="text-xs font-semibold text-foreground/80 tracking-wide uppercase"
          >
            Confirmar nova senha
          </Label>
          <Input
            id="confirmacao"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm"
            {...register("confirmacao")}
          />
          {errors.confirmacao && (
            <p className="text-xs text-destructive">{errors.confirmacao.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold shadow-md"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/resetar-senha/")({
  component: ResetarSenhaPage,
});
