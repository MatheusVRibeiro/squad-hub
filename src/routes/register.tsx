import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import axios from "axios";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const SKILLS = ["React", "Node.js", "Python", "Docker", "UI/UX", "DevOps"] as const;

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

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, isLoading, navigate]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { skills: [] },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signUp(values);
      toast.success("Conta criada com sucesso!");
      navigate({ to: isAuthenticated ? "/dashboard" : "/login" });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? (err.response.data as { message?: string }).message ?? "Não foi possível registrar"
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
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" placeholder="Seu nome" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@exemplo.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Localização</Label>
            <Input id="location" placeholder="Cidade, País" {...register("location")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" placeholder="Curta sobre você" {...register("bio")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Habilidades</Label>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
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
                    >
                      <Badge
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer rounded-full px-3 py-1 text-xs transition-all",
                          active ? "shadow-sm" : "hover:border-primary hover:text-primary",
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

        <Button type="submit" className="h-10 w-full rounded-xl" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});