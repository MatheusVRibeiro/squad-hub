import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
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

function ResetarSenhaPage() {
  const navigate = useNavigate();
  // Lê o token do link recebido por e-mail: /resetar-senha?token=...
  const search = useSearch({ strict: false }) as { token?: string };
  const token = typeof search?.token === "string" ? search.token : undefined;

  const [submitting, setSubmitting] = useState(false);

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

export const Route = createFileRoute("/resetar-senha")({
  component: ResetarSenhaPage,
});
