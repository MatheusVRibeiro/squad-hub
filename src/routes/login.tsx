import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const { signIn, signInTemp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, isLoading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signIn(values);
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? (err.response.data as { message?: string }).message ?? "Não foi possível entrar"
          : "Não foi possível entrar";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta para continuar montando squads."
      footer={
        <>
          Não tem conta?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@exemplo.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <button
              type="button"
              onClick={() => toast.info("Em breve: recuperação de senha")}
              className="text-xs text-primary hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="h-10 w-full rounded-xl" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>

        <Button
          type="button"
          className="h-10 w-full rounded-xl bg-muted text-muted-foreground"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              const email = getValues("email");
              await signInTemp?.({ email: email ?? "temp@example.com", password: "" });
              toast.success("Entrando em modo temporário");
              navigate({ to: "/dashboard" });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          Entrar temporário
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});