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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@exemplo.com" className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Senha</Label>
            <button
              type="button"
              onClick={() => toast.info("Em breve: recuperação de senha")}
              className="text-[10px] font-bold text-primary tracking-wide hover:underline uppercase"
            >
              Esqueci minha senha
            </button>
          </div>
          <Input id="password" type="password" placeholder="••••••••" className="h-11 rounded-xl border border-border/60 bg-background/40 px-4 focus-visible:ring-primary/20 text-sm" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-2.5 pt-1">
          <Button type="submit" className="h-11 w-full rounded-xl font-semibold shadow-md" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </Button>

          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-border/50 transition-colors font-medium text-xs shadow-sm"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                const email = getValues("email");
                await signInTemp?.({ email: email || "dev@example.com", password: "" });
                toast.success("Entrando em modo temporário");
                navigate({ to: "/dashboard" });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Entrar como visitante temporário
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});